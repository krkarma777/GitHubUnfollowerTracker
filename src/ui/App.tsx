import { Box, Text, useApp } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveToken } from '../core/auth.js';
import { Config, ConfigStore } from '../core/config.js';
import { AuthError, GitHubClient } from '../core/github.js';
import { computeRelations } from '../core/relations.js';
import { BulkUnfollow } from './BulkUnfollow.js';
import { Dashboard } from './Dashboard.js';
import { ErrorScreen } from './ErrorScreen.js';
import { Loading } from './Loading.js';
import { TokenPrompt } from './TokenPrompt.js';
import { UserList } from './UserList.js';

export type Screen =
  | 'token'
  | 'loading'
  | 'error'
  | 'dashboard'
  | 'notFollowingBack'
  | 'followers'
  | 'following'
  | 'fans'
  | 'whitelist'
  | 'bulkUnfollow';

export interface AppProps {
  store: ConfigStore;
  /** Injectable for tests; defaults to a real token-authenticated client. */
  createClient?: (token: string) => GitHubClient;
}

export function App({ store, createClient = GitHubClient.withToken }: AppProps) {
  const { exit } = useApp();
  const [config, setConfig] = useState<Config>(() => store.load());
  const [client, setClient] = useState<GitHubClient | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [error, setError] = useState<string | null>(null);
  const [viewerLogin, setViewerLogin] = useState('');
  const [canUnfollow, setCanUnfollow] = useState<boolean | null>(null);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [progress, setProgress] = useState({ followers: 0, following: 0 });

  const relations = useMemo(() => computeRelations(followers, following), [followers, following]);

  // Fetches the same data as core/report.ts buildReport(), but keeps the lists
  // as separate state so screens can mutate them, and needs a hook between
  // authenticating and fetching so a pasted token is only saved once it works.
  // Changes to the fetch sequence belong in both places.
  const loadData = useCallback(async (c: GitHubClient, onAuthenticated?: () => void) => {
    setScreen('loading');
    setProgress({ followers: 0, following: 0 });
    try {
      const viewer = await c.getViewer();
      onAuthenticated?.();
      const [followerList, followingList] = await Promise.all([
        c.fetchAllFollowers((loaded) => setProgress((p) => ({ ...p, followers: loaded }))),
        c.fetchAllFollowing((loaded) => setProgress((p) => ({ ...p, following: loaded }))),
      ]);
      setViewerLogin(viewer.login);
      setCanUnfollow(viewer.canUnfollow);
      setFollowers(followerList);
      setFollowing(followingList);
      setClient(c);
      setError(null);
      setScreen('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Only a rejected token belongs on the token prompt; anything else
      // (network, 5xx, rate limit) is not the user's credentials' fault.
      setScreen(err instanceof AuthError ? 'token' : 'error');
    }
  }, []);

  const start = useCallback(async () => {
    const token = await resolveToken({ configToken: config.token });
    if (!token) {
      setScreen('token');
      return;
    }
    await loadData(createClient(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.token, createClient, loadData]);

  useEffect(() => {
    void start();
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
      // Validate before persisting so a typo doesn't get saved to disk.
      const candidate = createClient(token);
      await loadData(candidate, () => {
        const nextConfig = { ...config, token };
        setConfig(nextConfig);
        store.save(nextConfig);
      });
    },
    [config, store, loadData, createClient],
  );

  if (screen === 'token') {
    return <TokenPrompt error={error} envTokenSet={Boolean(process.env.GITHUB_TOKEN)} onSubmit={handleToken} />;
  }
  if (screen === 'error') {
    return <ErrorScreen message={error} onRetry={() => void start()} onQuit={exit} />;
  }
  if (screen === 'loading' || !client) {
    return <Loading followers={progress.followers} following={progress.following} />;
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
    fans: { title: 'Fans (they follow you, you do not)', users: relations.fans },
    whitelist: { title: 'Whitelist', users: config.whitelist },
  }[screen];

  // `u` only makes sense on lists of people you actually follow.
  const listShowsFollowing = screen === 'notFollowingBack' || screen === 'following';

  return (
    <UserList
      title={listProps.title}
      users={listProps.users}
      whitelist={config.whitelist}
      canUnfollow={listShowsFollowing && canUnfollow !== false}
      onUnfollow={async (login) => {
        await client.unfollow(login);
        handleUnfollowed([login]);
      }}
      onToggleWhitelist={toggleWhitelist}
      onBack={() => setScreen('dashboard')}
    />
  );
}
