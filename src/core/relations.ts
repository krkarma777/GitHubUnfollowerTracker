export interface Relations {
  mutuals: string[];
  notFollowingBack: string[];
  fans: string[];
}

const toKeySet = (logins: string[]) => new Set(logins.map((l) => l.toLowerCase()));

/**
 * Splits the social graph into mutuals (followed back), notFollowingBack
 * (you follow them, they don't follow you) and fans (they follow you, you
 * don't follow them). Login comparison is case-insensitive.
 */
export function computeRelations(followers: string[], following: string[]): Relations {
  const followerKeys = toKeySet(followers);
  const followingKeys = toKeySet(following);

  return {
    mutuals: following.filter((l) => followerKeys.has(l.toLowerCase())),
    notFollowingBack: following.filter((l) => !followerKeys.has(l.toLowerCase())),
    fans: followers.filter((l) => !followingKeys.has(l.toLowerCase())),
  };
}

export function filterUnfollowTargets(notFollowingBack: string[], whitelist: string[]): string[] {
  const whitelistKeys = toKeySet(whitelist);
  return notFollowingBack.filter((l) => !whitelistKeys.has(l.toLowerCase()));
}
