import { RateLimitError } from './github.js';

export interface UnfollowResult {
  done: string[];
  failed: { login: string; error: string }[];
  aborted: boolean;
  rateLimited: boolean;
  rateLimitResetAt: Date | null;
}

export interface RunUnfollowOptions {
  /** Pause between consecutive unfollow requests. */
  delayMs?: number;
  onProgress?: (completed: number, total: number, login: string) => void;
  signal?: AbortSignal;
}

/** Sleeps, but wakes early if the signal aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms);
    function finish() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    }
    signal?.addEventListener('abort', finish, { once: true });
  });
}

/**
 * Unfollows `targets` one at a time with a 1s gap by default, per GitHub's
 * secondary-rate-limit guidance: mutating requests must not run concurrently
 * and should be spaced roughly a second apart. Individual failures are
 * recorded and the run continues; a rate limit or an aborted signal stops it.
 */
export async function runUnfollow(
  targets: string[],
  unfollowFn: (login: string) => Promise<void>,
  { delayMs = 1000, onProgress, signal }: RunUnfollowOptions = {},
): Promise<UnfollowResult> {
  const result: UnfollowResult = {
    done: [],
    failed: [],
    aborted: false,
    rateLimited: false,
    rateLimitResetAt: null,
  };

  for (const [index, login] of targets.entries()) {
    if (signal?.aborted) {
      result.aborted = true;
      return result;
    }
    if (index > 0 && delayMs > 0) {
      await sleep(delayMs, signal);
      if (signal?.aborted) {
        result.aborted = true;
        return result;
      }
    }

    try {
      await unfollowFn(login);
      result.done.push(login);
    } catch (err) {
      result.failed.push({ login, error: err instanceof Error ? err.message : String(err) });
      if (err instanceof RateLimitError) {
        result.rateLimited = true;
        result.rateLimitResetAt = err.resetAt;
        return result;
      }
    }
    onProgress?.(result.done.length + result.failed.length, targets.length, login);
  }

  return result;
}
