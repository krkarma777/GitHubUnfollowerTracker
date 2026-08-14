import { Octokit } from '@octokit/rest';

/**
 * Pinned REST API version (X-GitHub-Api-Version). Requests without the
 * header silently fall back to 2022-11-28.
 */
export const GITHUB_API_VERSION = '2026-03-10';

export interface Viewer {
  login: string;
  followers: number;
  following: number;
  /**
   * Whether the token can unfollow. `null` when it can't be determined —
   * fine-grained PATs and app tokens don't report OAuth scopes.
   */
  canUnfollow: boolean | null;
}

export class AuthError extends Error {}

export class PermissionError extends Error {}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly resetAt: Date | null,
  ) {
    super(message);
  }
}

interface HttpErrorLike {
  status?: number;
  message?: string;
  response?: { headers?: Record<string, string>; data?: { message?: string } };
}

/**
 * Reads the classic-token scope list. Returns null when the header is absent
 * or empty (fine-grained PAT / app token), meaning "can't tell".
 */
export function canUnfollowFromScopes(scopeHeader: unknown): boolean | null {
  if (typeof scopeHeader !== 'string' || scopeHeader.trim() === '') return null;
  const scopes = scopeHeader.split(',').map((s) => s.trim());
  // The classic `user` scope is a superset that includes user:follow.
  return scopes.includes('user:follow') || scopes.includes('user');
}

function mapError(err: unknown): never {
  const httpErr = err as HttpErrorLike;
  if (httpErr?.status === 404) {
    throw new PermissionError(
      'GitHub returned 404. Either the user no longer exists, or your token lacks the Followers write permission (user:follow scope on classic tokens).',
    );
  }
  if (httpErr?.status === 401) {
    throw new AuthError(
      'GitHub rejected the token (401). It may be expired or missing the Followers write permission (user:follow scope on classic tokens).',
    );
  }
  if (httpErr?.status === 403 || httpErr?.status === 429) {
    const headers = httpErr.response?.headers ?? {};
    const retryAfter = headers['retry-after'];
    const reset = headers['x-ratelimit-reset'];
    const detail = httpErr.response?.data?.message ?? httpErr.message ?? '';

    // A 403 is only a rate limit when GitHub says so. Fine-grained tokens
    // missing Followers:write also return 403 — with the quota untouched.
    const isRateLimit =
      httpErr.status === 429 ||
      retryAfter != null ||
      headers['x-ratelimit-remaining'] === '0' ||
      /rate limit/i.test(detail);

    if (!isRateLimit) {
      throw new PermissionError(
        `GitHub refused the request (403): ${detail || 'no detail'}. Your token likely lacks the Followers write permission (user:follow scope on classic tokens).`,
      );
    }

    // Secondary limits signal via Retry-After (seconds); primary via x-ratelimit-reset (epoch).
    const resetAt = retryAfter
      ? new Date(Date.now() + Number(retryAfter) * 1000)
      : reset
        ? new Date(Number(reset) * 1000)
        : null;
    throw new RateLimitError('GitHub API rate limit hit.', resetAt);
  }
  throw err;
}

const noop = () => {};

export class GitHubClient {
  constructor(private readonly octokit: Octokit) {}

  static withToken(token: string): GitHubClient {
    // GHUT_API_URL points at a GitHub Enterprise Server instance, and lets the
    // end-to-end tests run the built CLI against a local stub.
    const baseUrl = process.env.GHUT_API_URL?.trim();
    const octokit = new Octokit({
      auth: token,
      ...(baseUrl ? { baseUrl } : {}),
      // Octokit logs every failed request to stderr ("GET /user - 401 with id
      // ... in 12ms"). We map errors into our own messages, so that line is
      // duplicate noise in a --json pipeline. `warn` stays: deprecation
      // notices are worth surfacing.
      log: { debug: noop, info: noop, warn: console.warn, error: noop },
    });
    octokit.hook.before('request', (options) => {
      options.headers['x-github-api-version'] = GITHUB_API_VERSION;
    });
    return new GitHubClient(octokit);
  }

  async getViewer(): Promise<Viewer> {
    try {
      const { data, headers } = await this.octokit.rest.users.getAuthenticated();
      return {
        login: data.login,
        followers: data.followers,
        following: data.following,
        canUnfollow: canUnfollowFromScopes(headers?.['x-oauth-scopes']),
      };
    } catch (err) {
      mapError(err);
    }
  }

  async fetchAllFollowers(): Promise<string[]> {
    try {
      const users = await this.octokit.paginate(
        this.octokit.rest.users.listFollowersForAuthenticatedUser,
        { per_page: 100 },
      );
      return users.map((u) => u.login);
    } catch (err) {
      mapError(err);
    }
  }

  async fetchAllFollowing(): Promise<string[]> {
    try {
      const users = await this.octokit.paginate(
        this.octokit.rest.users.listFollowedByAuthenticatedUser,
        { per_page: 100 },
      );
      return users.map((u) => u.login);
    } catch (err) {
      mapError(err);
    }
  }

  async unfollow(username: string): Promise<void> {
    try {
      await this.octokit.rest.users.unfollow({ username });
    } catch (err) {
      mapError(err);
    }
  }
}
