import { GitHubClient, Viewer } from './github.js';
import { computeRelations, filterUnfollowTargets, Relations } from './relations.js';

export interface FollowReport {
  viewer: Viewer;
  followers: string[];
  following: string[];
  relations: Relations;
  /** Whitelist entries that are actually shielding someone from being unfollowed. */
  whitelisted: string[];
  unfollowTargets: string[];
}

/**
 * Reads the authenticated user's follow graph and works out who a bulk
 * unfollow would touch. Read-only: it never issues a DELETE.
 */
export async function buildReport(
  client: GitHubClient,
  whitelist: string[],
): Promise<FollowReport> {
  const viewer = await client.getViewer();
  const [followers, following] = await Promise.all([
    client.fetchAllFollowers(),
    client.fetchAllFollowing(),
  ]);

  const relations = computeRelations(followers, following);
  const unfollowTargets = filterUnfollowTargets(relations.notFollowingBack, whitelist);
  const targetKeys = new Set(unfollowTargets.map((l) => l.toLowerCase()));
  const whitelisted = relations.notFollowingBack.filter((l) => !targetKeys.has(l.toLowerCase()));

  return { viewer, followers, following, relations, whitelisted, unfollowTargets };
}

export function formatReportText(report: FollowReport): string {
  const { viewer, relations, whitelisted, unfollowTargets } = report;
  const lines = [
    `@${viewer.login} — ${report.followers.length} followers, ${report.following.length} following`,
    `${relations.mutuals.length} mutual · ${relations.notFollowingBack.length} not following back · ${relations.fans.length} fans`,
    '',
  ];

  if (viewer.canUnfollow === false) {
    lines.push(
      'Warning: this token has no user:follow scope, so unfollowing would fail.',
      '',
    );
  }

  if (unfollowTargets.length === 0) {
    lines.push('Nothing to unfollow.');
  } else {
    lines.push(`${unfollowTargets.length} would be unfollowed (${whitelisted.length} whitelisted):`);
    lines.push(...unfollowTargets.map((login) => `  ${login}`));
    lines.push('', 'This was a dry run. Nothing was changed.');
  }

  return lines.join('\n');
}

export function formatReportJson(report: FollowReport): string {
  const { viewer, relations, whitelisted, unfollowTargets } = report;
  return JSON.stringify(
    {
      login: viewer.login,
      counts: {
        followers: report.followers.length,
        following: report.following.length,
        mutual: relations.mutuals.length,
        notFollowingBack: relations.notFollowingBack.length,
        fans: relations.fans.length,
        whitelisted: whitelisted.length,
        wouldUnfollow: unfollowTargets.length,
      },
      notFollowingBack: relations.notFollowingBack,
      fans: relations.fans,
      whitelisted,
      wouldUnfollow: unfollowTargets,
    },
    null,
    2,
  );
}
