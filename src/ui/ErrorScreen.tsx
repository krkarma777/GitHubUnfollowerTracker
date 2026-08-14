import { Box, Text, useInput } from 'ink';

export interface ErrorScreenProps {
  message: string | null;
  onRetry: () => void;
  onQuit: () => void;
}

export function ErrorScreen({ message, onRetry, onQuit }: ErrorScreenProps) {
  useInput((input, key) => {
    if (input === 'r' || key.return) onRetry();
    if (input === 'q' || key.escape) onQuit();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="red">
        Could not reach GitHub
      </Text>
      <Text color="gray">{message ?? 'Unknown error'}</Text>
      <Box marginTop={1}>
        <Text color="gray">r retry · q quit</Text>
      </Box>
    </Box>
  );
}
