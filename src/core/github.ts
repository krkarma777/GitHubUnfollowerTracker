import { Octokit } from '@octokit/rest';

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
    throw new AuthError('GitHub rejected the token (401). It may be expired or missing the user:follow scope.');
  }
  if (httpErr?.status === 403 || httpErr?.status === 429) {
    const reset = httpErr.response?.headers?.['x-ratelimit-reset'];
    const resetAt = reset ? new Date(Number(reset) * 1000) : null;
    throw new RateLimitError('GitHub API rate limit hit.', resetAt);
  }
  throw err;
}

export class GitHubClient {
  constructor(private readonly octokit: Octokit) {}

  static withToken(token: string): GitHubClient {
    return new GitHubClient(new Octokit({ auth: token }));
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
