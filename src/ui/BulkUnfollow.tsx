import { Box, Text, useInput } from 'ink';
import { useRef, useState } from 'react';
import type { GitHubClient } from '../core/github.js';
import { filterUnfollowTargets } from '../core/relations.js';
import { runUnfollow, UnfollowResult } from '../core/unfollow-runner.js';

export interface BulkUnfollowProps {
  notFollowingBack: string[];
  whitelist: string[];
  client: GitHubClient;
  canUnfollow: boolean | null;
  onDone: (unfollowed: string[]) => void;
  onBack: () => void;
}

type Stage = 'confirm' | 'running' | 'summary';

export function BulkUnfollow(props: BulkUnfollowProps) {
  const targets = filterUnfollowTargets(props.notFollowingBack, props.whitelist);
  const [stage, setStage] = useState<Stage>('confirm');
  const [progress, setProgress] = useState({ completed: 0, lastLogin: '' });
  const [result, setResult] = useState<UnfollowResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Snapshot at start: props change under us once onDone updates the graph.
  const runTargetsRef = useRef<string[]>([]);

  useInput((input, key) => {
    if (stage === 'confirm') {
      if (input === 'y' && targets.length > 0) start();
      if (key.escape || input === 'n') props.onBack();
    } else if (stage === 'running') {
      if (key.escape) abortRef.current?.abort();
    } else if (stage === 'summary') {
      if (key.escape || key.return) props.onBack();
    }
  });

  function start() {
    setStage('running');
    const controller = new AbortController();
    abortRef.current = controller;
    const runTargets = [...targets];
    runTargetsRef.current = runTargets;

    runUnfollow(runTargets, (login) => props.client.unfollow(login), {
      signal: controller.signal,
      onProgress: (completed, _total, login) => setProgress({ completed, lastLogin: login }),
    })
      .catch((err): UnfollowResult => ({
        done: [],
        failed: [{ login: '—', error: err instanceof Error ? err.message : String(err) }],
        aborted: false,
        rateLimited: false,
        rateLimitResetAt: null,
      }))
      .then((res) => {
        setResult(res);
        props.onDone(res.done);
        setStage('summary');
      });
  }

  if (stage === 'confirm') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="magenta">
          Bulk unfollow
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            {props.notFollowingBack.length} not following you back, {props.whitelist.length}{' '}
            whitelisted → <Text bold color="red">{targets.length} will be unfollowed</Text>
          </Text>
          {props.canUnfollow === false && (
            <Text color="red">
              ⚠ Your token lacks the user:follow scope — every request will fail with 404. Fix the
              token before running this.
            </Text>
          )}
          {targets.length === 0 ? (
            <Text color="green">Nothing to do. esc to go back.</Text>
          ) : (
            <>
              <Text color="gray">
                Runs one request per second (GitHub secondary rate-limit guidance) — about{' '}
                {Math.ceil(targets.length / 60)} min.
              </Text>
              <Text color="yellow">Press y to confirm, esc to cancel.</Text>
            </>
          )}
        </Box>
      </Box>
    );
  }

  if (stage === 'running') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="magenta">
          Unfollowing… {progress.completed}/{runTargetsRef.current.length}
        </Text>
        <Text color="gray">last: {progress.lastLogin || '—'}</Text>
        <Text color="gray">esc to cancel</Text>
      </Box>
    );
  }

  const total = runTargetsRef.current.length;
  const processed = (result?.done.length ?? 0) + (result?.failed.length ?? 0);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={result?.aborted ? 'yellow' : 'magenta'}>
        {result?.aborted ? 'Cancelled' : 'Done'}
      </Text>
      {result?.aborted && (
        <Text color="yellow">
          Stopped by you — {processed} of {total} processed, {total - processed} left untouched.
        </Text>
      )}
      <Text color="green">Unfollowed {result?.done.length ?? 0}</Text>
      {result && result.failed.length > 0 && (
        <Box flexDirection="column">
          <Text color="red">Failed {result.failed.length}:</Text>
          {result.failed.slice(0, 5).map((f) => (
            <Text key={f.login} color="red">
              {'  '}
              {f.login}: {f.error}
            </Text>
          ))}
        </Box>
      )}
      {result?.rateLimited && (
        <Text color="yellow">
          Stopped early: rate limited
          {result.rateLimitResetAt ? `, resets ${result.rateLimitResetAt.toLocaleTimeString()}` : ''}.
        </Text>
      )}
      <Text color="gray">enter/esc back to dashboard</Text>
    </Box>
  );
}
