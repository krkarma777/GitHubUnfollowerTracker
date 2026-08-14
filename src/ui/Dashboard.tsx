import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Screen } from './App.js';

type MenuTarget = Exclude<Screen, 'token' | 'loading' | 'dashboard'> | 'quit';

const MENU: { label: string; target: MenuTarget }[] = [
  { label: 'Not following you back', target: 'notFollowingBack' },
  { label: 'Followers', target: 'followers' },
  { label: 'Following', target: 'following' },
  { label: 'Fans (you do not follow back)', target: 'fans' },
  { label: 'Whitelist', target: 'whitelist' },
  { label: 'Bulk unfollow non-followers', target: 'bulkUnfollow' },
  { label: 'Quit', target: 'quit' },
];

export interface DashboardProps {
  login: string;
  followers: number;
  following: number;
  mutuals: number;
  notFollowingBack: number;
  fans: number;
  whitelistSize: number;
  canUnfollow: boolean | null;
  onSelect: (target: MenuTarget) => void;
}

export function Dashboard(props: DashboardProps) {
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setCursor((c) => (c + MENU.length - 1) % MENU.length);
    if (key.downArrow) setCursor((c) => (c + 1) % MENU.length);
    if (key.return) props.onSelect(MENU[cursor].target);
    if (input === 'q') props.onSelect('quit');
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">
        GitHub Unfollower Tracker
      </Text>
      <Text color="gray">@{props.login}</Text>
      <Box marginTop={1} gap={3}>
        <Stat label="Followers" value={props.followers} />
        <Stat label="Following" value={props.following} />
        <Stat label="Mutual" value={props.mutuals} />
        <Stat label="Not following back" value={props.notFollowingBack} color="red" />
        <Stat label="Fans" value={props.fans} color="green" />
        <Stat label="Whitelist" value={props.whitelistSize} color="yellow" />
      </Box>
      {props.canUnfollow === false && (
        <Box marginTop={1}>
          <Text color="red">
            ⚠ This token has no user:follow scope — unfollowing will fail. Use a token with
            Followers: write (fine-grained) or the user:follow scope (classic).
          </Text>
        </Box>
      )}
      <Box flexDirection="column" marginTop={1}>
        {MENU.map((item, i) => (
          <Text key={item.target} color={i === cursor ? 'cyan' : undefined}>
            {i === cursor ? '❯ ' : '  '}
            {item.label}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">↑↓ move · enter select · q quit</Text>
      </Box>
    </Box>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Box flexDirection="column">
      <Text bold color={color}>
        {value}
      </Text>
      <Text color="gray">{label}</Text>
    </Box>
  );
}
