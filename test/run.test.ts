import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigStore } from '../src/core/config.js';
import { AuthError, RateLimitError } from '../src/core/github.js';
import { EXIT, run, RunOptions } from '../src/core/run.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ghut-run-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function harness(overrides: Partial<RunOptions> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const client = {
    getViewer: vi.fn().mockResolvedValue({
      login: 'me',
      followers: 2,
      following: 3,
      canUnfollow: true,
    }),
    fetchAllFollowers: vi.fn().mockResolvedValue(['alice', 'bob']),
    fetchAllFollowing: vi.fn().mockResolvedValue(['alice', 'dave', 'erin']),
    unfollow: vi.fn(),
  };

  const options: RunOptions = {
    argv: [],
    out: (s) => out.push(s),
    err: (s) => err.push(s),
    isTTY: true,
    version: '9.9.9',
    store: new ConfigStore(dir),
    resolveToken: async () => 'token',
    createClient: () => client as never,
    ...overrides,
  };

  return { options, out, err, client, go: () => run(options) };
}

describe('run', () => {
  it('asks the caller to launch the TUI when given no flags on a terminal', async () => {
    const { go } = harness();
    expect(await go()).toBe('tui');
  });

  it('refuses the TUI without a terminal and points at the scriptable flags', async () => {
    const { go, err } = harness({ isTTY: false });

    expect(await go()).toBe(EXIT.FAILURE);
    expect(err.join('\n')).toMatch(/--dry-run/);
  });

  it('runs a dry run without a terminal', async () => {
    const { go, out } = harness({ argv: ['--dry-run'], isTTY: false });

    expect(await go()).toBe(EXIT.OK);
    expect(out.join('\n')).toContain('dave');
  });

  it('never launches the TUI on a dry run, even on a terminal', async () => {
    const { go } = harness({ argv: ['--dry-run'], isTTY: true });
    expect(await go()).not.toBe('tui');
  });

  it('never unfollows anyone on a dry run', async () => {
    const { go, client } = harness({ argv: ['--dry-run'] });

    await go();
    expect(client.unfollow).not.toHaveBeenCalled();
  });

  it('emits parseable JSON for --json', async () => {
    const { go, out } = harness({ argv: ['--json'] });

    expect(await go()).toBe(EXIT.OK);
    const parsed = JSON.parse(out.join('\n'));
    expect(parsed.login).toBe('me');
    expect(parsed.wouldUnfollow).toEqual(['dave', 'erin']);
  });

  it('rejects unknown flags with a usage exit code', async () => {
    const { go, err } = harness({ argv: ['--dryrun'] });

    expect(await go()).toBe(EXIT.USAGE);
    expect(err.join('\n')).toContain('--dryrun');
  });

  it('prints help even when other flags are unrecognised', async () => {
    const { go, out } = harness({ argv: ['--bogus', '--help'] });

    expect(await go()).toBe(EXIT.OK);
    expect(out.join('\n')).toContain('Usage:');
  });

  it('prints the version', async () => {
    const { go, out } = harness({ argv: ['--version'] });

    expect(await go()).toBe(EXIT.OK);
    expect(out.join('\n')).toContain('9.9.9');
  });

  it('fails cleanly when no token can be resolved', async () => {
    const { go, err } = harness({ argv: ['--dry-run'], resolveToken: async () => null });

    expect(await go()).toBe(EXIT.FAILURE);
    expect(err.join('\n')).toMatch(/token/i);
  });

  it('reports an authentication failure distinctly', async () => {
    const { go, err, client } = harness({ argv: ['--dry-run'] });
    client.getViewer.mockRejectedValue(new AuthError('bad credentials'));

    expect(await go()).toBe(EXIT.FAILURE);
    expect(err.join('\n')).toContain('bad credentials');
  });

  it('uses a distinct exit code for rate limits and reports when they reset', async () => {
    const { go, err, client } = harness({ argv: ['--dry-run'] });
    client.getViewer.mockRejectedValue(
      new RateLimitError('rate limited', new Date('2026-08-14T05:00:00Z')),
    );

    expect(await go()).toBe(EXIT.RATE_LIMITED);
    expect(err.join('\n')).toMatch(/2026-08-14T05:00:00/);
  });
});
