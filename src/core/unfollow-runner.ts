import { RateLimitError } from './github.js';

export interface UnfollowResult {
  done: string[];
  failed: { login: string; error: string }[];
  rateLimited: boolean;
  rateLimitResetAt: Date | null;
}

export interface RunUnfollowOptions {
  concurrency?: number;
  /** Pause between consecutive unfollow requests, per worker. */
  delayMs?: number;
  onProgress?: (completed: number, total: number, login: string) => void;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Unfollows `targets`, by default serialized with a 1s gap between requests —
 * GitHub's secondary-rate-limit guidance for mutating calls (DELETE costs 5
 * points, ~900 points/min budget). Individual failures are recorded and the
 * run continues; a RateLimitError or an aborted signal stops scheduling
 * further targets.
 */
export async function runUnfollow(
  targets: string[],
  unfollowFn: (login: string) => Promise<void>,
  { concurrency = 1, delayMs = 1000, onProgress, signal }: RunUnfollowOptions = {},
): Promise<UnfollowResult> {
  const result: UnfollowResult = { done: [], failed: [], rateLimited: false, rateLimitResetAt: null };
  let next = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    let first = true;
    while (next < targets.length) {
      if (signal?.aborted || result.rateLimited) return;
      const login = targets[next++];
      if (!first && delayMs > 0) {
        await sleep(delayMs);
        if (signal?.aborted || result.rateLimited) return;
      }
      first = false;
      try {
        await unfollowFn(login);
        result.done.push(login);
      } catch (err) {
        if (err instanceof RateLimitError) {
          result.rateLimited = true;
          result.rateLimitResetAt = err.resetAt;
          return;
        }
        result.failed.push({ login, error: err instanceof Error ? err.message : String(err) });
      }
      completed++;
      onProgress?.(completed, targets.length, login);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
  return result;
}
