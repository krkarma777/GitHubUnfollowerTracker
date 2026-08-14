import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

export interface TokenPromptProps {
  error: string | null;
  onSubmit: (token: string) => void;
}

export function TokenPrompt({ error, onSubmit }: TokenPromptProps) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.return) {
      const token = value.trim();
      if (token) onSubmit(token);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setValue((v) => v + input);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">
        GitHub token required
      </Text>
      {error && <Text color="red">{error}</Text>}
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">
          Paste a personal access token with the user:follow scope (or set GITHUB_TOKEN / log in
          with gh CLI and restart).
        </Text>
        <Text>
          Token: <Text color="cyan">{'*'.repeat(value.length)}</Text>
        </Text>
        <Text color="gray">enter to submit</Text>
      </Box>
    </Box>
  );
}
