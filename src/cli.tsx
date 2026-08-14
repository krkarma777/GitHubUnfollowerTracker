#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from 'ink';
import { parseArgs } from './core/args.js';
import { resolveToken } from './core/auth.js';
import { ConfigStore, defaultConfigDir } from './core/config.js';
import { AuthError, GitHubClient } from './core/github.js';
import { buildReport, formatReportJson, formatReportText } from './core/report.js';
import { App } from './ui/App.js';

const { mode, json, unknown } = parseArgs(process.argv.slice(2));

function packageVersion(): string {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
}

function help(): string {
  return `ghut — GitHub Unfollower Tracker (v${packageVersion()})

Usage:
  ghut              Launch the interactive TUI
  ghut --dry-run    Print who a bulk unfollow would touch, then exit
  ghut --json       Same as --dry-run, as JSON (implies --dry-run)
  ghut --version    Print the version
  ghut --help       Show this help

--dry-run and --json never modify anything and do not need a terminal, so
they can run in scripts and CI.

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

Keys:
  arrows move · enter select · u unfollow · w whitelist · esc back · q quit`;
}

if (unknown.length > 0) {
  console.error(`Unrecognised ${unknown.length > 1 ? 'options' : 'option'}: ${unknown.join(', ')}`);
  console.error('Run `ghut --help` for usage.');
  process.exit(2);
}

if (mode === 'version') {
  console.log(packageVersion());
  process.exit(0);
}

if (mode === 'help') {
  console.log(help());
  process.exit(0);
}

if (mode === 'dry-run') {
  const store = new ConfigStore();
  const config = store.load();
  const token = await resolveToken({ configToken: config.token });

  if (!token) {
    console.error(
      'No GitHub token found. Set GITHUB_TOKEN, run `gh auth login`, or launch `ghut` to paste one.',
    );
    process.exit(1);
  }

  try {
    const report = await buildReport(GitHubClient.withToken(token), config.whitelist);
    console.log(json ? formatReportJson(report) : formatReportText(report));
    process.exit(0);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(err instanceof AuthError ? `Authentication failed: ${detail}` : detail);
    process.exit(1);
  }
}

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error(
    'ghut is an interactive TUI and needs a terminal (TTY). Use --dry-run or --json in scripts.',
  );
  process.exit(1);
}

render(<App store={new ConfigStore()} />);
