import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { BulkUnfollow } from '../src/ui/BulkUnfollow.js';

const settle = async (ms: number) => new Promise((r) => setTimeout(r, ms));

function setup(targets: string[]) {
  const unfollow = vi.fn().mockResolvedValue(undefined);
  const client = { unfollow } as never;
  const api = render(
    <BulkUnfollow
      notFollowingBack={targets}
      whitelist={[]}
      client={client}
      canUnfollow={true}
      onDone={() => {}}
      onBack={() => {}}
    />,
  );
  return { unfollow, ...api };
}

describe('BulkUnfollow', () => {
  it('stops unfollowing when the component is unmounted mid-run', async () => {
    // Ctrl+C unmounts the Ink tree without ending the process. Without an
    // unmount abort the runner keeps issuing one irreversible unfollow per
    // second with no UI attached.
    const { unfollow, stdin, unmount } = setup(['a', 'b', 'c', 'd']);
    await settle(60); // let Ink attach the input handler

    stdin.write('y');
    await settle(150);
    expect(unfollow).toHaveBeenCalledTimes(1);

    unmount();
    await settle(1400); // more than the runner's 1s gap

    expect(unfollow).toHaveBeenCalledTimes(1);
    expect(unfollow).not.toHaveBeenCalledWith('b');
  });

  it('keeps going while it stays mounted', async () => {
    const { unfollow, stdin, unmount } = setup(['a', 'b']);
    await settle(60);

    stdin.write('y');
    await settle(1400);

    expect(unfollow).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('does not start anything until the run is confirmed', async () => {
    const { unfollow, stdin, unmount } = setup(['a', 'b']);
    await settle(60);

    stdin.write('n');
    await settle(150);

    expect(unfollow).not.toHaveBeenCalled();
    unmount();
  });
});
