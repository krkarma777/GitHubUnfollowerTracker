import { describe, expect, it, vi } from 'vitest';
import { AuthError, GitHubClient, PermissionError, RateLimitError } from '../src/core/github.js';

function httpError(status: number, headers: Record<string, string> = {}, message?: string) {
  const err = new Error(message ?? `HTTP ${status}`) as Error & {
    status: number;
    response: { headers: Record<string, string>; data?: { message?: string } };
  };
  err.status = status;
  err.response = { headers, ...(message ? { data: { message } } : {}) };
  return err;
}

function fakeOctokit(overrides: Record<string, unknown> = {}) {
  return {
    paginate: vi.fn(),
    rest: {
      users: {
        getAuthenticated: vi.fn().mockResolvedValue({
          data: { login: 'me', followers: 10, following: 20 },
          headers: { 'x-oauth-scopes': 'repo, user:follow' },
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

    expect(await client.getViewer()).toEqual({
      login: 'me',
      followers: 10,
      following: 20,
      canUnfollow: true,
    });
  });

  it('getViewer flags canUnfollow false when the token scopes lack user:follow', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.getAuthenticated.mockResolvedValue({
      data: { login: 'me', followers: 1, following: 2 },
      headers: { 'x-oauth-scopes': 'gist, read:org, repo, workflow' },
    });
    const client = new GitHubClient(octokit as never);

    expect((await client.getViewer()).canUnfollow).toBe(false);
  });

  it('treats the classic `user` scope as covering user:follow', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.getAuthenticated.mockResolvedValue({
      data: { login: 'me', followers: 1, following: 2 },
      headers: { 'x-oauth-scopes': 'repo, user' },
    });
    const client = new GitHubClient(octokit as never);

    expect((await client.getViewer()).canUnfollow).toBe(true);
  });

  it('reports canUnfollow as unknown for fine-grained tokens that send no scope header', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.getAuthenticated.mockResolvedValue({
      data: { login: 'me', followers: 1, following: 2 },
      headers: {},
    });
    const client = new GitHubClient(octokit as never);

    expect((await client.getViewer()).canUnfollow).toBeNull();
  });

  it('maps a permission-denied 403 to PermissionError, not a rate limit', async () => {
    // Fine-grained PATs without Followers:write get 403 with the quota untouched.
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(
      httpError(
        403,
        { 'x-ratelimit-remaining': '4998', 'x-ratelimit-limit': '5000' },
        'Resource not accessible by personal access token',
      ),
    );
    const client = new GitHubClient(octokit as never);

    const err = await client.unfollow('dave').catch((e) => e);
    expect(err).toBeInstanceOf(PermissionError);
    expect(err).not.toBeInstanceOf(RateLimitError);
    expect((err as Error).message).toContain('Resource not accessible');
  });

  it('still maps an exhausted primary quota (403, remaining 0) to RateLimitError', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(
      httpError(
        403,
        { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1755150000' },
        'API rate limit exceeded',
      ),
    );
    const client = new GitHubClient(octokit as never);

    const err = await client.unfollow('dave').catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
  });

  it('maps a secondary rate limit (403 + retry-after) to RateLimitError', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(
      httpError(403, { 'retry-after': '60' }, 'You have exceeded a secondary rate limit'),
    );
    const client = new GitHubClient(octokit as never);

    expect(await client.unfollow('dave').catch((e) => e)).toBeInstanceOf(RateLimitError);
  });

  it('maps 429 to RateLimitError even without rate-limit headers', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(httpError(429));
    const client = new GitHubClient(octokit as never);

    expect(await client.unfollow('dave').catch((e) => e)).toBeInstanceOf(RateLimitError);
  });

  it('maps 404 on unfollow to a permission-flavored error', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(httpError(404));
    const client = new GitHubClient(octokit as never);

    const err = await client.unfollow('dave').catch((e) => e);
    expect(err).toBeInstanceOf(PermissionError);
    expect((err as Error).message).toMatch(/user:follow|Followers/);
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

  it('maps an exhausted-quota 403 to RateLimitError with reset time from headers', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(
      httpError(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1755150000' }),
    );
    const client = new GitHubClient(octokit as never);

    const err = await client.unfollow('dave').catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).resetAt).toEqual(new Date(1755150000 * 1000));
  });

  it('prefers Retry-After over x-ratelimit-reset for secondary limits', async () => {
    const octokit = fakeOctokit();
    octokit.rest.users.unfollow.mockRejectedValue(httpError(403, { 'retry-after': '60' }));
    const client = new GitHubClient(octokit as never);
    const before = Date.now();

    const err = await client.unfollow('dave').catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    const resetMs = (err as RateLimitError).resetAt!.getTime() - before;
    expect(resetMs).toBeGreaterThanOrEqual(59_000);
    expect(resetMs).toBeLessThanOrEqual(61_000);
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
