import { afterEach, describe, expect, it, vi } from 'vitest';
import { RateLimitError } from '../src/core/github.js';
import { runUnfollow } from '../src/core/unfollow-runner.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.useRealTimers();
});

describe('runUnfollow', () => {
  it('unfollows every target and reports progress', async () => {
    const calls: string[] = [];
    const progress: number[] = [];

    const result = await runUnfollow(
      ['a', 'b', 'c'],
      async (login) => {
        calls.push(login);
      },
      { delayMs: 0, onProgress: (done, total) => progress.push(done / total) },
    );

    expect(calls).toEqual(['a', 'b', 'c']);
    expect(result.done).toEqual(['a', 'b', 'c']);
    expect(result.failed).toEqual([]);
    expect(result.aborted).toBe(false);
    expect(progress).toHaveLength(3);
  });

  it('issues requests one at a time, never concurrently', async () => {
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
      { delayMs: 0 },
    );

    expect(peak).toBe(1);
  });

  it('waits delayMs between consecutive requests (serialized by default)', async () => {
    vi.useFakeTimers();
    const calls: string[] = [];

    const promise = runUnfollow(['a', 'b'], async (login) => {
      calls.push(login);
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(999);
    expect(calls).toEqual(['a']);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual(['a', 'b']);

    const result = await promise;
    expect(result.done).toEqual(['a', 'b']);
  });

  it('records individual failures and keeps going', async () => {
    const result = await runUnfollow(
      ['a', 'bad', 'c'],
      async (login) => {
        if (login === 'bad') throw new Error('boom');
      },
      { delayMs: 0 },
    );

    expect(result.done).toEqual(['a', 'c']);
    expect(result.failed).toEqual([{ login: 'bad', error: 'boom' }]);
  });

  it('stops on RateLimitError and still accounts for the interrupted target', async () => {
    const calls: string[] = [];

    const result = await runUnfollow(
      ['a', 'b', 'c', 'd'],
      async (login) => {
        calls.push(login);
        if (login === 'b') throw new RateLimitError('rate limited', null);
      },
      { delayMs: 0 },
    );

    expect(calls).toEqual(['a', 'b']);
    expect(result.done).toEqual(['a']);
    expect(result.rateLimited).toBe(true);
    // every attempted target lands in exactly one bucket
    expect(result.failed.map((f) => f.login)).toEqual(['b']);
    expect(result.done.length + result.failed.length).toBe(calls.length);
  });

  it('flags an aborted run so it is distinguishable from a finished one', async () => {
    const controller = new AbortController();
    const calls: string[] = [];

    const result = await runUnfollow(
      ['a', 'b', 'c'],
      async (login) => {
        calls.push(login);
        if (login === 'a') controller.abort();
      },
      { delayMs: 0, signal: controller.signal },
    );

    expect(calls).toEqual(['a']);
    expect(result.done).toEqual(['a']);
    expect(result.aborted).toBe(true);
    expect(result.rateLimited).toBe(false);
  });

  it('returns promptly when aborted mid-delay instead of waiting it out', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const calls: string[] = [];

    const promise = runUnfollow(
      ['a', 'b'],
      async (login) => {
        calls.push(login);
      },
      { delayMs: 60_000, signal: controller.signal },
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual(['a']);

    controller.abort();
    await vi.advanceTimersByTimeAsync(1); // must not need the full 60s
    const result = await promise;

    expect(calls).toEqual(['a']);
    expect(result.aborted).toBe(true);
  });
});
