import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

const WINDOW = 15;

export interface UserListProps {
  title: string;
  users: string[];
  whitelist: string[];
  canUnfollow: boolean;
  onUnfollow: (login: string) => Promise<void>;
  onToggleWhitelist: (login: string) => void;
  onBack: () => void;
}

export function UserList(props: UserListProps) {
  const [cursor, setCursor] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const whitelistKeys = new Set(props.whitelist.map((w) => w.toLowerCase()));
  const count = props.users.length;
  const clampedCursor = Math.min(cursor, Math.max(0, count - 1));
  const windowStart = Math.max(0, Math.min(clampedCursor - Math.floor(WINDOW / 2), count - WINDOW));
  const visible = props.users.slice(windowStart, windowStart + WINDOW);

  useInput((input, key) => {
    if (busy) return;
    if (key.escape) props.onBack();
    if (count === 0) return;
    if (key.upArrow) setCursor(Math.max(0, clampedCursor - 1));
    if (key.downArrow) setCursor(Math.min(count - 1, clampedCursor + 1));
    if (input === 'w') props.onToggleWhitelist(props.users[clampedCursor]);
    if (input === 'u' && props.canUnfollow) {
      const login = props.users[clampedCursor];
      setBusy(true);
      setMessage(`Unfollowing ${login}…`);
      props
        .onUnfollow(login)
        .then(() => setMessage(`Unfollowed ${login}`))
        .catch((err) => setMessage(`Failed: ${err instanceof Error ? err.message : err}`))
        .finally(() => setBusy(false));
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">
        {props.title} ({count})
      </Text>
      {count === 0 ? (
        <Text color="gray">Nobody here.</Text>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {visible.map((login, i) => {
            const index = windowStart + i;
            const selected = index === clampedCursor;
            const starred = whitelistKeys.has(login.toLowerCase());
            return (
              <Text key={login} color={selected ? 'cyan' : undefined}>
                {selected ? '❯ ' : '  '}
                {login}
                {starred ? ' ★' : ''}
              </Text>
            );
          })}
          {count > WINDOW && (
            <Text color="gray">
              … {windowStart + 1}–{windowStart + visible.length} of {count}
            </Text>
          )}
        </Box>
      )}
      {message && (
        <Box marginTop={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray">
          ↑↓ move{props.canUnfollow ? ' · u unfollow' : ''} · w whitelist · esc back
        </Text>
      </Box>
    </Box>
  );
}
