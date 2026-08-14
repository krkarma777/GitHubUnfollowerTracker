import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(root, 'dist', 'cli.js');

const FOLLOWING_COUNT = 3000;
const following = Array.from({ length: FOLLOWING_COUNT }, (_, i) => `padded-login-name-${i}`);

/**
 * A stub GitHub API, so these tests drive the real built binary through a real
 * pipe. Bugs that only appear when stdout is a pipe — the class of bug this
 * file exists to catch — are invisible to in-process tests.
 */
let server: Server;
let apiUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];
    const json = (body: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(200, { 'content-type': 'application/json', ...headers });
      res.end(JSON.stringify(body));
    };

    if ((req.headers.authorization ?? '').includes('bad-token')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'Bad credentials' }));
    } else if (path === '/user') {
      json(
        { login: 'stub-user', followers: 0, following: FOLLOWING_COUNT },
        { 'x-oauth-scopes': 'repo, user:follow' },
      );
    } else if (path === '/user/followers') {
      json([]);
    } else if (path === '/user/following') {
      json(following.map((login) => ({ login })));
    } else {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'Not Found' }));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function cli(args: string[], env: NodeJS.ProcessEnv = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI, ...args], {
      env: { ...process.env, GHUT_CONFIG_DIR: join(root, 'node_modules', '.ghut-test'), ...env },
      maxBuffer: 64 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

describe('built CLI', () => {
  it('is built before these tests run', () => {
    expect(existsSync(CLI), `${CLI} missing — run npm run build`).toBe(true);
  });

  it('prints the whole help through a pipe and exits 0', async () => {
    const { code, stdout } = await cli(['--help']);

    expect(code).toBe(0);
    expect(stdout).toContain('Usage:');
    expect(stdout.trimEnd().endsWith('q quit')).toBe(true);
  });

  it('prints the version and exits 0', async () => {
    const { code, stdout } = await cli(['--version']);

    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('exits 2 on an unrecognised flag and prints nothing to stdout', async () => {
    const { code, stdout, stderr } = await cli(['--dryrun']);

    expect(code).toBe(2);
    expect(stderr).toContain('--dryrun');
    expect(stdout).toBe('');
  });

  it('refuses to launch the TUI when stdout is a pipe', async () => {
    const { code, stderr } = await cli([]);

    expect(code).toBe(1);
    expect(stderr).toMatch(/terminal|TTY/i);
  });

  it('delivers a large --json report through a pipe without truncating it', async () => {
    // Regression test: console.log followed by process.exit(0) drops everything
    // past the ~64KB pipe buffer, silently, with a success exit code.
    const { code, stdout } = await cli(['--json'], {
      GHUT_API_URL: apiUrl,
      GITHUB_TOKEN: 'stub-token',
    });

    expect(code).toBe(0);
    expect(stdout.length).toBeGreaterThan(100_000);

    const parsed = JSON.parse(stdout);
    expect(parsed.login).toBe('stub-user');
    expect(parsed.wouldUnfollow).toHaveLength(FOLLOWING_COUNT);
    expect(parsed.counts.wouldUnfollow).toBe(FOLLOWING_COUNT);
  });

  it('reports an auth failure without leaking Octokit request logging', async () => {
    const { code, stderr, stdout } = await cli(['--json'], {
      GHUT_API_URL: apiUrl,
      GITHUB_TOKEN: 'bad-token',
    });

    expect(code).toBe(1);
    expect(stderr).toContain('Authentication failed');
    // Octokit logs "GET /user - 401 with id ... in 12ms" via log.error by
    // default, which is noise in a pipeline and says more than it should.
    expect(stderr).not.toMatch(/GET \/user/);
    expect(stderr).not.toMatch(/with id/);
    expect(stdout).toBe('');
  });

  it('delivers the large text report through a pipe intact', async () => {
    const { code, stdout } = await cli(['--dry-run'], {
      GHUT_API_URL: apiUrl,
      GITHUB_TOKEN: 'stub-token',
    });

    expect(code).toBe(0);
    expect(stdout).toContain(`${FOLLOWING_COUNT} would be unfollowed`);
    // The closing line proves nothing was cut off mid-stream.
    expect(stdout.trimEnd().endsWith('Nothing was changed.')).toBe(true);
  });
});
