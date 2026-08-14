import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Config {
  token?: string;
  whitelist: string[];
}

const DEFAULT_CONFIG: Config = { whitelist: [] };

export function defaultConfigDir(): string {
  return process.env.GHUT_CONFIG_DIR ?? join(homedir(), '.config', 'ghut');
}

export class ConfigStore {
  private readonly filePath: string;

  constructor(private readonly dir: string = defaultConfigDir()) {
    this.filePath = join(dir, 'config.json');
  }

  load(): Config {
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8'));
      return {
        ...(typeof parsed.token === 'string' ? { token: parsed.token } : {}),
        whitelist: Array.isArray(parsed.whitelist) ? parsed.whitelist : [],
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  save(config: Config): void {
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    writeFileSync(this.filePath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
    // `mode` above only applies on creation; tighten a pre-existing loose file.
    chmodSync(this.filePath, 0o600);
  }
}
