import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigStore } from '../src/core/config.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ghut-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('ConfigStore', () => {
  it('returns defaults when the config file is missing', () => {
    const store = new ConfigStore(dir);
    expect(store.load()).toEqual({ whitelist: [] });
  });

  it('round-trips token and whitelist', () => {
    const store = new ConfigStore(dir);
    store.save({ token: 'ghp_abc', whitelist: ['alice', 'bob'] });

    const loaded = new ConfigStore(dir).load();
    expect(loaded).toEqual({ token: 'ghp_abc', whitelist: ['alice', 'bob'] });
  });

  it('writes the config file with 0600 permissions', () => {
    const store = new ConfigStore(dir);
    store.save({ token: 'secret', whitelist: [] });

    const mode = statSync(join(dir, 'config.json')).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('treats corrupt JSON as defaults instead of throwing', () => {
    writeFileSync(join(dir, 'config.json'), '{not json');
    const store = new ConfigStore(dir);
    expect(store.load()).toEqual({ whitelist: [] });
  });

  it('creates the directory on save when missing', () => {
    const nested = join(dir, 'deep', 'nested');
    const store = new ConfigStore(nested);
    store.save({ whitelist: ['x'] });
    expect(JSON.parse(readFileSync(join(nested, 'config.json'), 'utf8')).whitelist).toEqual(['x']);
  });
});
