import { describe, expect, it } from 'vitest';
import { RateLimitError } from '../src/core/github.js';
import { runUnfollow } from '../src/core/unfollow-runner.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('runUnfollow', () => {
  it('unfollows every target and reports progress', async () => {
    const calls: string[] = [];
    const progress: number[] = [];

    const result = await runUnfollow(
      ['a', 'b', 'c'],
      async (login) => {
        calls.push(login);
      },
      { concurrency: 2, onProgress: (done, total) => progress.push(done / total) },
    );

    expect(calls.sort()).toEqual(['a', 'b', 'c']);
    expect(result.done.sort()).toEqual(['a', 'b', 'c']);
    expect(result.failed).toEqual([]);
    expect(progress).toHaveLength(3);
  });

  it('never runs more than `concurrency` unfollows at once', async () => {
    let active = 0;
    let peak = 0;

    await runUnfollow(
      ['a', 'b', 'c', 'd', 'e', 'f'],
      async () => {
        active++;
        peak = Math.max(peak, active);
        await tick();
        active--;
      },
      { concurrency: 2 },
    );

    expect(peak).toBeLessThanOrEqual(2);
  });

  it('records individual failures and keeps going', async () => {
    const result = await runUnfollow(
      ['a', 'bad', 'c'],
      async (login) => {
        if (login === 'bad') throw new Error('boom');
      },
      { concurrency: 1 },
    );

    expect(result.done.sort()).toEqual(['a', 'c']);
    expect(result.failed).toEqual([{ login: 'bad', error: 'boom' }]);
  });

  it('aborts remaining targets on RateLimitError', async () => {
    const calls: string[] = [];

    const result = await runUnfollow(
      ['a', 'b', 'c', 'd'],
      async (login) => {
        calls.push(login);
        if (login === 'b') throw new RateLimitError('rate limited', null);
      },
      { concurrency: 1 },
    );

    expect(calls).toEqual(['a', 'b']);
    expect(result.done).toEqual(['a']);
    expect(result.rateLimited).toBe(true);
  });

  it('stops scheduling new targets when the abort signal fires', async () => {
    const controller = new AbortController();
    const calls: string[] = [];

    const result = await runUnfollow(
      ['a', 'b', 'c'],
      async (login) => {
        calls.push(login);
        if (login === 'a') controller.abort();
        await tick();
      },
      { concurrency: 1, signal: controller.signal },
    );

    expect(calls).toEqual(['a']);
    expect(result.done).toEqual(['a']);
  });
});
