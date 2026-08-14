import { describe, expect, it, vi } from 'vitest';
import { buildReport, formatReportJson, formatReportText } from '../src/core/report.js';

function fakeClient(followers: string[], following: string[]) {
  return {
    getViewer: vi.fn().mockResolvedValue({
      login: 'me',
      followers: followers.length,
      following: following.length,
      canUnfollow: true,
    }),
    fetchAllFollowers: vi.fn().mockResolvedValue(followers),
    fetchAllFollowing: vi.fn().mockResolvedValue(following),
  };
}

const REPORT = {
  viewer: { login: 'me', followers: 2, following: 3, canUnfollow: true },
  followers: ['alice', 'bob'],
  following: ['alice', 'dave', 'erin'],
  relations: { mutuals: ['alice'], notFollowingBack: ['dave', 'erin'], fans: ['bob'] },
  whitelisted: ['erin'],
  unfollowTargets: ['dave'],
};

describe('buildReport', () => {
  it('assembles viewer, relations, and whitelist-filtered targets', async () => {
    const client = fakeClient(['alice', 'bob'], ['alice', 'dave', 'erin']);

    const report = await buildReport(client, ['erin']);

    expect(report.viewer.login).toBe('me');
    expect(report.relations.notFollowingBack).toEqual(['dave', 'erin']);
    expect(report.relations.fans).toEqual(['bob']);
    expect(report.unfollowTargets).toEqual(['dave']);
    expect(report.whitelisted).toEqual(['erin']);
  });

  it('only reports whitelist entries that are actually unfollow candidates', async () => {
    const client = fakeClient(['alice'], ['alice', 'dave']);

    // `ghost` is whitelisted but not someone we follow, so it is not shielding anything.
    const report = await buildReport(client, ['ghost']);

    expect(report.whitelisted).toEqual([]);
    expect(report.unfollowTargets).toEqual(['dave']);
  });

  it('never calls unfollow', async () => {
    const client = { ...fakeClient(['a'], ['a', 'b']), unfollow: vi.fn() };

    await buildReport(client, []);

    expect(client.unfollow).not.toHaveBeenCalled();
  });
});

describe('formatReportText', () => {
  it('lists the targets and the counts behind them', () => {
    const out = formatReportText(REPORT);

    expect(out).toContain('@me');
    expect(out).toContain('dave');
    expect(out).toContain('1 would be unfollowed');
    expect(out).toContain('1 whitelisted');
  });

  it('says so plainly when there is nothing to do', () => {
    const out = formatReportText({
      ...REPORT,
      relations: { mutuals: ['alice'], notFollowingBack: [], fans: [] },
      whitelisted: [],
      unfollowTargets: [],
    });

    expect(out).toContain('Nothing to unfollow');
    expect(out).not.toContain('would be unfollowed');
  });

  it('warns when the token cannot unfollow', () => {
    const out = formatReportText({ ...REPORT, viewer: { ...REPORT.viewer, canUnfollow: false } });
    expect(out).toContain('user:follow');
  });
});

describe('formatReportJson', () => {
  it('emits a stable, parseable shape', () => {
    const parsed = JSON.parse(formatReportJson(REPORT));

    expect(parsed).toEqual({
      login: 'me',
      canUnfollow: true,
      counts: {
        followers: 2,
        following: 3,
        mutual: 1,
        notFollowingBack: 2,
        fans: 1,
        whitelisted: 1,
        wouldUnfollow: 1,
      },
      notFollowingBack: ['dave', 'erin'],
      fans: ['bob'],
      whitelisted: ['erin'],
      wouldUnfollow: ['dave'],
    });
  });
});
