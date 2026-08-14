import { Box, Text, useApp } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveToken } from '../core/auth.js';
import { Config, ConfigStore } from '../core/config.js';
import { AuthError, GitHubClient } from '../core/github.js';
import { computeRelations } from '../core/relations.js';
import { BulkUnfollow } from './BulkUnfollow.js';
import { Dashboard } from './Dashboard.js';
import { TokenPrompt } from './TokenPrompt.js';
import { UserList } from './UserList.js';

export type Screen =
  | 'token'
  | 'loading'
  | 'dashboard'
  | 'notFollowingBack'
  | 'followers'
  | 'following'
  | 'whitelist'
  | 'bulkUnfollow';

export function App({ store }: { store: ConfigStore }) {
  const { exit } = useApp();
  const [config, setConfig] = useState<Config>(() => store.load());
  const [client, setClient] = useState<GitHubClient | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [error, setError] = useState<string | null>(null);
  const [viewerLogin, setViewerLogin] = useState('');
  const [canUnfollow, setCanUnfollow] = useState<boolean | null>(null);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  const relations = useMemo(() => computeRelations(followers, following), [followers, following]);

  const loadData = useCallback(async (c: GitHubClient) => {
    setScreen('loading');
    try {
      const viewer = await c.getViewer();
      const [followerList, followingList] = await Promise.all([
        c.fetchAllFollowers(),
        c.fetchAllFollowing(),
      ]);
      setViewerLogin(viewer.login);
      setCanUnfollow(viewer.canUnfollow);
      setFollowers(followerList);
      setFollowing(followingList);
      setClient(c);
      setError(null);
      setScreen('dashboard');
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
        setScreen('token');
      } else {
        setError(err instanceof Error ? err.message : String(err));
        setScreen('token');
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await resolveToken({ configToken: config.token });
      if (!token) {
        setScreen('token');
        return;
      }
      await loadData(GitHubClient.withToken(token));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveWhitelist = useCallback(
    (whitelist: string[]) => {
      const nextConfig = { ...config, whitelist };
      setConfig(nextConfig);
      store.save(nextConfig);
    },
    [config, store],
  );

  const toggleWhitelist = useCallback(
    (login: string) => {
      const key = login.toLowerCase();
      const has = config.whitelist.some((w) => w.toLowerCase() === key);
      saveWhitelist(
        has ? config.whitelist.filter((w) => w.toLowerCase() !== key) : [...config.whitelist, login],
      );
    },
    [config.whitelist, saveWhitelist],
  );

  const handleUnfollowed = useCallback((logins: string[]) => {
    const removed = new Set(logins.map((l) => l.toLowerCase()));
    setFollowing((prev) => prev.filter((l) => !removed.has(l.toLowerCase())));
  }, []);

  const handleToken = useCallback(
    async (token: string) => {
      const nextConfig = { ...config, token };
      setConfig(nextConfig);
      store.save(nextConfig);
      await loadData(GitHubClient.withToken(token));
    },
    [config, store, loadData],
  );

  if (screen === 'token') {
    return <TokenPrompt error={error} onSubmit={handleToken} />;
  }
  if (screen === 'loading' || !client) {
    return (
      <Box padding={1}>
        <Text color="cyan">Loading your GitHub social graph…</Text>
      </Box>
    );
  }
  if (screen === 'dashboard') {
    return (
      <Dashboard
        login={viewerLogin}
        followers={followers.length}
        following={following.length}
        mutuals={relations.mutuals.length}
        notFollowingBack={relations.notFollowingBack.length}
        fans={relations.fans.length}
        whitelistSize={config.whitelist.length}
        canUnfollow={canUnfollow}
        onSelect={(s) => (s === 'quit' ? exit() : setScreen(s))}
      />
    );
  }
  if (screen === 'bulkUnfollow') {
    return (
      <BulkUnfollow
        notFollowingBack={relations.notFollowingBack}
        whitelist={config.whitelist}
        client={client}
        canUnfollow={canUnfollow}
        onDone={handleUnfollowed}
        onBack={() => setScreen('dashboard')}
      />
    );
  }

  const listProps = {
    notFollowingBack: { title: 'Not following you back', users: relations.notFollowingBack },
    followers: { title: 'Followers', users: followers },
    following: { title: 'Following', users: following },
    whitelist: { title: 'Whitelist', users: config.whitelist },
  }[screen];

  return (
    <UserList
      title={listProps.title}
      users={listProps.users}
      whitelist={config.whitelist}
      canUnfollow={screen !== 'followers' && screen !== 'whitelist'}
      onUnfollow={async (login) => {
        await client.unfollow(login);
        handleUnfollowed([login]);
      }}
      onToggleWhitelist={toggleWhitelist}
      onBack={() => setScreen('dashboard')}
    />
  );
}
