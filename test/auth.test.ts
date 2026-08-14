import { describe, expect, it } from 'vitest';
import { resolveToken } from '../src/core/auth.js';

describe('resolveToken', () => {
  it('prefers GITHUB_TOKEN from the environment', async () => {
    const token = await resolveToken({
      env: { GITHUB_TOKEN: 'env-token' },
      configToken: 'config-token',
      execGhToken: async () => 'gh-token',
    });
    expect(token).toBe('env-token');
  });

  it('falls back to the stored config token', async () => {
    const token = await resolveToken({
      env: {},
      configToken: 'config-token',
      execGhToken: async () => 'gh-token',
    });
    expect(token).toBe('config-token');
  });

  it('falls back to gh CLI token, trimmed', async () => {
    const token = await resolveToken({
      env: {},
      execGhToken: async () => 'gh-token\n',
    });
    expect(token).toBe('gh-token');
  });

  it('returns null when gh CLI fails and nothing else is set', async () => {
    const token = await resolveToken({
      env: {},
      execGhToken: async () => {
        throw new Error('gh not installed');
      },
    });
    expect(token).toBeNull();
  });

  it('ignores empty gh CLI output', async () => {
    const token = await resolveToken({
      env: {},
      execGhToken: async () => '  \n',
    });
    expect(token).toBeNull();
  });
});
