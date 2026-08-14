#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from 'ink';
import { resolveToken } from './core/auth.js';
import { ConfigStore } from './core/config.js';
import { GitHubClient } from './core/github.js';
import { run } from './core/run.js';
import { App } from './ui/App.js';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const store = new ConfigStore();

const result = await run({
  argv: process.argv.slice(2),
  out: (text) => console.log(text),
  err: (text) => console.error(text),
  isTTY: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  version: JSON.parse(readFileSync(pkgPath, 'utf8')).version,
  store,
  resolveToken: (configToken) => resolveToken({ configToken }),
  createClient: GitHubClient.withToken,
});

if (result === 'tui') {
  render(<App store={store} />);
} else {
  // Not process.exit(): that would truncate stdout mid-write on a pipe.
  process.exitCode = result;
}
