import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigStore } from '../src/core/config.js';
import { AuthError } from '../src/core/github.js';
import { App } from '../src/ui/App.js';

const ARROW_DOWN = '[B';
const ENTER = '\r';
const ESC = '';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ghut-app-'));
  process.env.GITHUB_TOKEN = 'test-token';
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.GITHUB_TOKEN;
  vi.restoreAllMocks();
});

/** Minimal GitHubClient stand-in; overrides let each test shape the scenario. */
function fakeClient(overrides: Record<string, unknown> = {}) {
  return {
    getViewer: vi.fn().mockResolvedValue({
      login: 'me',
      followers: 2,
      following: 2,
      canUnfollow: true,
    }),
    fetchAllFollowers: vi.fn().mockResolvedValue(['alice']),
    fetchAllFollowing: vi.fn().mockResolvedValue(['alice', 'dave']),
    unfollow: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** Lets Ink flush effects and pending promises. */
const settle = async (times = 6) => {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 5));
};

function renderApp(client: ReturnType<typeof fakeClient>) {
  const store = new ConfigStore(dir);
  return {
    store,
    ...render(<App store={store} createClient={() => client as never} />),
  };
}

describe('App', () => {
  it('loads the graph and shows relation counts on the dashboard', async () => {
    const { lastFrame } = renderApp(fakeClient());
    await settle();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('@me');
    expect(frame).toContain('Not following back');
    expect(frame).toContain('Bulk unfollow');
  });

  it('drops the user from the following list after an unfollow', async () => {
    const client = fakeClient();
    const { lastFrame, stdin } = renderApp(client);
    await settle();

    stdin.write(ENTER); // menu item 0 → "Not following you back"
    await settle();
    expect(lastFrame()).toContain('dave');

    stdin.write('u');
    await settle();

    expect(client.unfollow).toHaveBeenCalledWith('dave');
    expect(lastFrame()).toContain('Unfollowed dave');

    stdin.write(ESC);
    await settle();
    // dave was the only non-follower, so the count must now be 0
    expect(lastFrame()).toContain('Not following back');
    expect(lastFrame()).not.toContain('dave');
  });

  it('persists a whitelist toggle to the config file', async () => {
    const { stdin, store } = renderApp(fakeClient());
    await settle();

    stdin.write(ENTER); // "Not following you back"
    await settle();
    stdin.write('w');
    await settle();

    expect(store.load().whitelist).toEqual(['dave']);
  });

  it('excludes whitelisted users from the bulk unfollow target count', async () => {
    const store = new ConfigStore(dir);
    store.save({ whitelist: ['dave'] });
    const { lastFrame, stdin } = render(
      <App store={store} createClient={() => fakeClient() as never} />,
    );
    await settle();

    // Walk the menu until the bulk-unfollow row is selected, so the test
    // survives menu reordering.
    for (let i = 0; i < 10 && !(lastFrame() ?? '').includes('❯ Bulk unfollow'); i++) {
      stdin.write(ARROW_DOWN);
      await settle(2);
    }
    expect(lastFrame()).toContain('❯ Bulk unfollow');
    stdin.write(ENTER);
    await settle();

    expect(lastFrame()).toContain('1 whitelisted');
    expect(lastFrame()).toContain('0 will be unfollowed');
  });

  it('shows the token prompt when the token is rejected', async () => {
    const client = fakeClient({
      getViewer: vi.fn().mockRejectedValue(new AuthError('token expired')),
    });
    const { lastFrame } = renderApp(client);
    await settle();

    expect(lastFrame()).toContain('GitHub token required');
    expect(lastFrame()).toContain('token expired');
  });

  it('shows a retryable error screen — not the token prompt — for non-auth failures', async () => {
    const client = fakeClient({
      getViewer: vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.github.com')),
    });
    const { lastFrame } = renderApp(client);
    await settle();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('ENOTFOUND');
    expect(frame).not.toContain('GitHub token required');
    expect(frame.toLowerCase()).toContain('retry');
  });

  it('warns that a rejected GITHUB_TOKEN will keep taking precedence', async () => {
    const client = fakeClient({
      getViewer: vi.fn().mockRejectedValue(new AuthError('bad credentials')),
    });
    const { lastFrame } = renderApp(client);
    await settle();

    expect(lastFrame()).toContain('GITHUB_TOKEN');
  });
});
