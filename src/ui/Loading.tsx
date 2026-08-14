import { Box, Text } from 'ink';

export interface LoadingProps {
  followers: number;
  following: number;
}

export function Loading({ followers, following }: LoadingProps) {
  const started = followers > 0 || following > 0;

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan">Loading your GitHub social graph…</Text>
      {started && (
        <Text color="gray">
          {followers} followers · {following} following
        </Text>
      )}
    </Box>
  );
}
