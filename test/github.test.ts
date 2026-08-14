import { describe, expect, it, vi } from 'vitest';
import { AuthError, GitHubClient, RateLimitError } from '../src/core/github.js';

function httpError(status: number, headers: Record<string, string> = {}) {
  const err = new Error(`HTTP ${status}`) as Error & {
    status: number;
    response: { headers: Record<string, string> };
  };
  err.status = status;
  err.response = { headers };
  return err;
}

function fakeOctokit(overrides: Record<string, unknown> = {}) {
  return {
    paginate: vi.fn(),
    rest: {
      users: {
        getAuthenticated: vi.fn().mockResolvedValue({
          data: { login: 'me', followers: 10, following: 20 },
        }),
        listFollowersForAuthenticatedUser: 'followers-route',
        listFollowedByAuthenticatedUser: 'following-route',
        unfollow: vi.fn().mockResolvedValue({}),
      },
    },
    ...overrides,
  };
}

describe('GitHubClient', () => {
  it('getViewer returns login and counts', async () => {
    const octokit = fakeOctokit();
    const client = new GitHubClient(octokit as never);

    expect(await client.getViewer()).toEqual({ login: 'me', followers: 10, following: 20 });
  });

  it('fetches all followers and following via paginate, mapping to logins', async () => {
    const octokit = fakeOctokit();
    octokit.paginate
      .mockResolvedValueOnce([{ login: 'a' }, { login: 'b' }])
      .mockResolvedValueOnce([{ login: 'c' }]);
    const client = new GitHubClient(octokit as never);

    expect(await client.fetchAllFollowers()).toEqual(['a', 'b']);
    expect(await client.fetchAllFollowing()).toEqual(['c']);
    expect(octokit.paginate).toHaveBeenCalledWith('followers-route', { per_page: 100 });
    expect(octokit.paginate).toHaveBeenCalledWith('following-route', { per_page: 100 });
  });

  it('unfollow calls the unfollow endpoint with the username', async () => {
    const octokit = fakeOctokit();
    const client = new GitHubClient(octokit as never);

    await client.unfollow('dave');
    expect(octokit.rest.users.unfollow).toHaveBeenCalledWith({ username: 'dave' });
  });

  it('maps 401 to AuthError', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.getAuthenticated.mockRejectedValue(httpError(401));
    const client = new GitHubClient(octokit as never);

    await expect(client.getViewer()).rejects.toBeInstanceOf(AuthError);
  });

  it('maps 403 to RateLimitError with reset time from headers', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(
      httpError(403, { 'x-ratelimit-reset': '1755150000' }),
    );
    const client = new GitHubClient(octokit as never);

    const err = await client.unfollow('dave').catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).resetAt).toEqual(new Date(1755150000 * 1000));
  });

  it('passes through other errors untouched', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(httpError(500));
    const client = new GitHubClient(octokit as never);

    const err = await client.unfollow('dave').catch((e) => e);
    expect(err).not.toBeInstanceOf(RateLimitError);
    expect(err).not.toBeInstanceOf(AuthError);
  });
});
