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
}

export class AuthError extends Error {}

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
  response?: { headers?: Record<string, string> };
}

function mapError(err: unknown): never {
  const httpErr = err as HttpErrorLike;
  if (httpErr?.status === 401) {
    throw new AuthError(
      'GitHub rejected the token (401). It may be expired or missing the Followers write permission (user:follow scope on classic tokens).',
    );
  }
  if (httpErr?.status === 403 || httpErr?.status === 429) {
    const headers = httpErr.response?.headers ?? {};
    // Secondary rate limits signal via Retry-After (seconds); primary via x-ratelimit-reset (epoch).
    const retryAfter = headers['retry-after'];
    const reset = headers['x-ratelimit-reset'];
    const resetAt = retryAfter
      ? new Date(Date.now() + Number(retryAfter) * 1000)
      : reset
        ? new Date(Number(reset) * 1000)
        : null;
    throw new RateLimitError('GitHub API rate limit hit.', resetAt);
  }
  throw err;
}

export class GitHubClient {
  constructor(private readonly octokit: Octokit) {}

  static withToken(token: string): GitHubClient {
    const octokit = new Octokit({ auth: token });
    octokit.hook.before('request', (options) => {
      options.headers['x-github-api-version'] = GITHUB_API_VERSION;
    });
    return new GitHubClient(octokit);
  }

  async getViewer(): Promise<Viewer> {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return { login: data.login, followers: data.followers, following: data.following };
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
