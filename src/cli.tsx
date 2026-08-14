#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from 'ink';
import { ConfigStore, defaultConfigDir } from './core/config.js';
import { App } from './ui/App.js';

const args = process.argv.slice(2);

function packageVersion(): string {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(packageVersion());
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`ghut — GitHub Unfollower Tracker (v${packageVersion()})

Usage:
  ghut              Launch the interactive TUI
  ghut --version    Print the version
  ghut --help       Show this help

Authentication (first match wins):
  1. GITHUB_TOKEN environment variable
  2. token saved in ${join(defaultConfigDir(), 'config.json')}
  3. gh auth token   (GitHub CLI)
  4. interactive prompt

The token needs the Followers write permission (fine-grained) or the
user:follow scope (classic).

Keys:
  arrows move · enter select · u unfollow · w whitelist · esc back · q quit`);
  process.exit(0);
}

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('ghut is an interactive TUI and needs a terminal (TTY). Try --help.');
  process.exit(1);
}

render(<App store={new ConfigStore()} />);
