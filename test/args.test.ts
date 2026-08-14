import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/core/args.js';

describe('parseArgs', () => {
  it('defaults to launching the interactive TUI', () => {
    expect(parseArgs([])).toEqual({
      mode: 'tui',
      json: false,
      unknown: [],
    });
  });

  it('recognises help and version, including short forms', () => {
    expect(parseArgs(['--help']).mode).toBe('help');
    expect(parseArgs(['-h']).mode).toBe('help');
    expect(parseArgs(['--version']).mode).toBe('version');
    expect(parseArgs(['-v']).mode).toBe('version');
  });

  it('recognises --dry-run', () => {
    expect(parseArgs(['--dry-run'])).toEqual({
      mode: 'dry-run',
      json: false,
      unknown: [],
    });
  });

  it('treats --json as implying a dry run, since there is no interactive JSON', () => {
    expect(parseArgs(['--json'])).toEqual({
      mode: 'dry-run',
      json: true,
      unknown: [],
    });
    expect(parseArgs(['--dry-run', '--json'])).toEqual({
      mode: 'dry-run',
      json: true,
      unknown: [],
    });
  });

  it('lets help win over every other flag', () => {
    expect(parseArgs(['--dry-run', '--help']).mode).toBe('help');
    expect(parseArgs(['--version', '--help']).mode).toBe('help');
  });

  it('collects unrecognised flags instead of silently ignoring them', () => {
    // A typo like --dryrun must not quietly launch the TUI.
    expect(parseArgs(['--dryrun'])).toEqual({
      mode: 'tui',
      json: false,
      unknown: ['--dryrun'],
    });
    expect(parseArgs(['--dry-run', '--colour']).unknown).toEqual(['--colour']);
  });
});
