import { describe, expect, it } from 'vitest';
import { computeRelations, filterUnfollowTargets } from '../src/core/relations.js';

describe('computeRelations', () => {
  it('splits following into mutuals and notFollowingBack, followers into fans', () => {
    const followers = ['alice', 'bob', 'carol'];
    const following = ['bob', 'dave'];

    const result = computeRelations(followers, following);

    expect(result.mutuals).toEqual(['bob']);
    expect(result.notFollowingBack).toEqual(['dave']);
    expect(result.fans).toEqual(['alice', 'carol']);
  });

  it('compares logins case-insensitively but preserves original casing', () => {
    const result = computeRelations(['Alice'], ['alice', 'Bob']);

    expect(result.mutuals).toEqual(['alice']);
    expect(result.notFollowingBack).toEqual(['Bob']);
    expect(result.fans).toEqual([]);
  });

  it('handles empty inputs', () => {
    expect(computeRelations([], [])).toEqual({
      mutuals: [],
      notFollowingBack: [],
      fans: [],
    });
    expect(computeRelations([], ['x']).notFollowingBack).toEqual(['x']);
    expect(computeRelations(['y'], []).fans).toEqual(['y']);
  });
});

describe('filterUnfollowTargets', () => {
  it('excludes whitelisted users case-insensitively', () => {
    const targets = filterUnfollowTargets(['Dave', 'erin', 'frank'], ['dave', 'FRANK']);
    expect(targets).toEqual(['erin']);
  });

  it('returns all targets when whitelist is empty', () => {
    expect(filterUnfollowTargets(['a', 'b'], [])).toEqual(['a', 'b']);
  });
});
