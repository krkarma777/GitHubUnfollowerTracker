#!/usr/bin/env node
import { render } from 'ink';
import { ConfigStore } from './core/config.js';
import { App } from './ui/App.js';

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('ghut is an interactive TUI and needs a terminal (TTY).');
  process.exit(1);
}

render(<App store={new ConfigStore()} />);
