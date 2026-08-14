import { RateLimitError } from './github.js';

export interface UnfollowResult {
  done: string[];
  failed: { login: string; error: string }[];
  rateLimited: boolean;
  rateLimitResetAt: Date | null;
}

export interface RunUnfollowOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number, login: string) => void;
  signal?: AbortSignal;
}

/**
 * Unfollows `targets` with bounded concurrency. Individual failures are
 * recorded and the run continues; a RateLimitError or an aborted signal
 * stops scheduling further targets.
 */
export async function runUnfollow(
  targets: string[],
  unfollowFn: (login: string) => Promise<void>,
  { concurrency = 5, onProgress, signal }: RunUnfollowOptions = {},
): Promise<UnfollowResult> {
  const result: UnfollowResult = { done: [], failed: [], rateLimited: false, rateLimitResetAt: null };
  let next = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (next < targets.length) {
      if (signal?.aborted || result.rateLimited) return;
      const login = targets[next++];
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
