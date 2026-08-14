import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ResolveTokenOptions {
  env?: NodeJS.ProcessEnv;
  configToken?: string;
  execGhToken?: () => Promise<string>;
}

async function ghAuthToken(): Promise<string> {
  const { stdout } = await execFileAsync('gh', ['auth', 'token']);
  return stdout;
}

/**
 * Resolves a GitHub token in priority order:
 * GITHUB_TOKEN env var → stored config token → `gh auth token`.
 * Returns null when nothing usable is found.
 */
export async function resolveToken({
  env = process.env,
  configToken,
  execGhToken = ghAuthToken,
}: ResolveTokenOptions = {}): Promise<string | null> {
  const envToken = env.GITHUB_TOKEN?.trim();
  if (envToken) return envToken;

  if (configToken) return configToken;

  try {
    const ghToken = (await execGhToken()).trim();
    if (ghToken) return ghToken;
  } catch {
    // gh CLI missing or not logged in — fall through
  }

  return null;
}
