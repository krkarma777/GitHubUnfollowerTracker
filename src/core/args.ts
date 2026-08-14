export type Mode = 'tui' | 'dry-run' | 'help' | 'version';

export interface ParsedArgs {
  mode: Mode;
  json: boolean;
  /** Flags we don't recognise — surfaced rather than ignored, so typos don't launch the TUI. */
  unknown: string[];
}

const KNOWN = new Set(['--help', '-h', '--version', '-v', '--dry-run', '--json']);

export function parseArgs(argv: string[]): ParsedArgs {
  const unknown = argv.filter((a) => !KNOWN.has(a));
  const has = (...flags: string[]) => flags.some((f) => argv.includes(f));

  const json = has('--json');
  // --json has no interactive form, so asking for it means asking for a dry run.
  const mode: Mode = has('--help', '-h')
    ? 'help'
    : has('--version', '-v')
      ? 'version'
      : has('--dry-run') || json
        ? 'dry-run'
        : 'tui';

  return { mode, json, unknown };
}
