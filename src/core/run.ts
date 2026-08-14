import { join } from 'node:path';
import { parseArgs } from './args.js';
import { ConfigStore, defaultConfigDir } from './config.js';
import { AuthError, GitHubClient, RateLimitError } from './github.js';
import { buildReport, formatReportJson, formatReportText } from './report.js';

export const EXIT = {
  OK: 0,
  FAILURE: 1,
  USAGE: 2,
  RATE_LIMITED: 3,
} as const;

/** `'tui'` asks the caller to render the Ink app; core never imports Ink. */
export type RunResult = number | 'tui';

export interface RunOptions {
  argv: string[];
  out: (text: string) => void;
  err: (text: string) => void;
  isTTY: boolean;
  version: string;
  store: ConfigStore;
  resolveToken: (configToken?: string) => Promise<string | null>;
  createClient: (token: string) => GitHubClient;
}

function helpText(version: string): string {
  return `ghut — GitHub Unfollower Tracker (v${version})

Usage:
  ghut              Launch the interactive TUI
  ghut --dry-run    Print who a bulk unfollow would touch, then exit
  ghut --json       Same as --dry-run, as JSON (implies --dry-run)
  ghut --version    Print the version
  ghut --help       Show this help

--dry-run and --json never modify anything and do not need a terminal, so
they can run in scripts and CI.

Exit codes:
  0  success
  1  could not run (no token, authentication failed, network error)
  2  usage error (unrecognised option)
  3  rate limited by GitHub

Authentication (first match wins):
  1. GITHUB_TOKEN environment variable
  2. token saved in ${join(defaultConfigDir(), 'config.json')}
  3. gh auth token   (GitHub CLI)
  4. interactive prompt

The token needs the Followers write permission (fine-grained) or the
user:follow scope (classic). With the GitHub CLI:
  gh auth refresh -s user:follow

Environment:
  GITHUB_TOKEN       Token to use, highest precedence
  GHUT_CONFIG_DIR    Override the config directory (default above)
  GHUT_API_URL       Override the GitHub API base URL (GitHub Enterprise)

Keys:
  arrows move · enter select · u unfollow · w whitelist · esc back · q quit`;
}

/**
 * Decides what the CLI should do and produces its output. Returns an exit
 * code, or `'tui'` when the caller should launch the interactive app.
 *
 * Deliberately never calls `process.exit`: exiting mid-write truncates stdout
 * at the pipe buffer, which silently corrupts `--json` for large accounts.
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const { argv, out, err, isTTY, version, store, resolveToken, createClient } = options;
  const { mode, json, unknown } = parseArgs(argv);

  if (mode === 'help') {
    out(helpText(version));
    return EXIT.OK;
  }

  if (unknown.length > 0) {
    err(`Unrecognised ${unknown.length > 1 ? 'options' : 'option'}: ${unknown.join(', ')}`);
    err('Run `ghut --help` for usage.');
    return EXIT.USAGE;
  }

  if (mode === 'version') {
    out(version);
    return EXIT.OK;
  }

  if (mode === 'dry-run') {
    const config = store.load();
    const token = await resolveToken(config.token);
    if (!token) {
      err(
        'No GitHub token found. Set GITHUB_TOKEN, run `gh auth login`, or launch `ghut` to paste one.',
      );
      return EXIT.FAILURE;
    }

    try {
      const report = await buildReport(createClient(token), config.whitelist);
      out(json ? formatReportJson(report) : formatReportText(report));
      return EXIT.OK;
    } catch (error) {
      if (error instanceof RateLimitError) {
        const resets = error.resetAt ? `, resets at ${error.resetAt.toISOString()}` : '';
        err(`${error.message}${resets}`);
        return EXIT.RATE_LIMITED;
      }
      const detail = error instanceof Error ? error.message : String(error);
      err(error instanceof AuthError ? `Authentication failed: ${detail}` : detail);
      return EXIT.FAILURE;
    }
  }

  if (!isTTY) {
    err('ghut is an interactive TUI and needs a terminal (TTY). Use --dry-run or --json in scripts.');
    return EXIT.FAILURE;
  }

  return 'tui';
}
