# github-unfollower

**Find out who doesn't follow you back on GitHub — and bulk-unfollow them from your terminal.**

[![npm version](https://img.shields.io/npm/v/github-unfollower.svg)](https://www.npmjs.com/package/github-unfollower)
[![npm downloads](https://img.shields.io/npm/dm/github-unfollower.svg)](https://www.npmjs.com/package/github-unfollower)
[![CI](https://github.com/krkarma777/GitHubUnfollowerTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/krkarma777/GitHubUnfollowerTracker/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/github-unfollower.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/github-unfollower.svg)](./LICENSE)

No browser, no OAuth app to register, no data leaves your machine. One command:

```bash
npx github-unfollower
```

```
 GitHub Unfollower Tracker
 @octocat

 1379        1154        1154     201                  225    3
 Followers   Following   Mutual   Not following back   Fans   Whitelist

 ❯ Not following you back
   Followers
   Following
   Fans (you do not follow back)
   Whitelist
   Bulk unfollow non-followers
   Quit

 ↑↓ move · enter select · q quit
```

---

## Why

GitHub shows you followers and following, but never the difference. Working out who quietly
unfollowed you means paging through two lists by hand — and unfollowing 200 people means 200
clicks. This does both in one screen, and unfollows at a pace GitHub is happy with.

- **Safe by default** — nothing is unfollowed without an explicit `y` confirmation
- **Whitelist** — protect people you want to keep following, even if they never follow back
- **Rate-limit aware** — one request per second, per GitHub's secondary-limit guidance; stops
  early and tells you when the limit resets
- **Cancellable** — `esc` mid-run stops cleanly and reports exactly how far it got
- **Local only** — your token stays in `~/.config/ghut/config.json` (mode `0600`)

## Install

```bash
# run without installing
npx github-unfollower

# or install globally — the command is `ghut`
npm install -g github-unfollower
ghut
```

Requires Node.js >= 20 and an interactive terminal (TTY).

```bash
ghut --help      # usage, auth chain, keybindings
ghut --version
```

## Authentication

Already using the [GitHub CLI](https://cli.github.com)? Then it just works — no setup at all.

A token is resolved in this order (first match wins):

1. `GITHUB_TOKEN` environment variable
2. Token saved in `~/.config/ghut/config.json`
3. `gh auth token` — GitHub CLI
4. Interactive prompt (saved with `0600` permissions)

Your token needs permission to unfollow:

| Token type | Required permission |
|---|---|
| GitHub CLI | `gh auth refresh -s user:follow` |
| Fine-grained PAT | **Followers: read and write** |
| Classic PAT | **`user:follow`** scope |

If the token can't unfollow, you're warned on the dashboard *before* you start — not after 200
failed requests.

> GitHub Actions' built-in `GITHUB_TOKEN` is an installation access token and does **not** work
> with the follow endpoints. Use a fine-grained PAT stored as a secret.

## Screens

| Screen | What it does |
|---|---|
| **Dashboard** | Followers / following / mutual / not-following-back / fans / whitelist counts |
| **Not following you back** | The list that matters — unfollow individually or whitelist |
| **Followers / Following** | Full lists, paginated automatically |
| **Fans** | People who follow you that you don't follow back |
| **Whitelist** | Everyone you've protected (marked `★`) |
| **Bulk unfollow** | Confirm → live progress → summary of done / failed / skipped |

## Keybindings

| Key | Action |
|---|---|
| `↑` `↓` | Move cursor |
| `enter` | Select |
| `u` | Unfollow highlighted user |
| `w` | Toggle whitelist (`★`) for highlighted user |
| `y` | Confirm bulk unfollow |
| `esc` | Back / cancel a running bulk unfollow |
| `r` | Retry after a connection error |
| `q` | Quit |

## FAQ

**How do I see who unfollowed me on GitHub?**
Run `npx github-unfollower` and open *Not following you back*. It's every account you follow that
doesn't follow you — which includes everyone who unfollowed you.

**Does it unfollow anyone automatically?**
No. Bulk unfollow requires you to select it and press `y`. Individual unfollows require `u` on a
highlighted user.

**How long does unfollowing hundreds of people take?**
About one minute per 60 users. Requests are deliberately serialized one per second so GitHub's
secondary rate limit is never tripped.

**Can I undo it?**
No — GitHub has no bulk re-follow. Whitelist anyone you want to keep (`w`) *before* running a bulk
unfollow, and check the confirmation count.

**Is my token sent anywhere?**
No. It's used only for direct calls to `api.github.com` and stored locally at
`~/.config/ghut/config.json` with `0600` permissions.

**Does it work with organizations / private accounts?**
It operates on the authenticated user's own follower graph only.

## API compliance

- Pins `X-GitHub-Api-Version: 2026-03-10` (unversioned requests silently fall back to `2022-11-28`)
- Serializes mutating requests ~1s apart, per GitHub's
  [secondary rate limit guidance](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- Distinguishes permission-denied `403` from genuine rate limits, so a scope problem never
  masquerades as throttling
- Paginates at `per_page=100`, so accounts with thousands of follows work fine
- Automation at scale is restricted by GitHub's
  [Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies);
  this tool acts only on explicit confirmation

## Development

```bash
npm install
npm test        # vitest — core logic + Ink UI
npm run typecheck
npm run build   # tsc → dist/
node dist/cli.js
```

Architecture: pure logic in `src/core/` (no UI imports, fully unit-tested), Ink components in
`src/ui/`. Every IO seam is injectable, so tests never touch the network.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](./CONTRIBUTING.md) covers the architecture
tour, conventions, and how to verify your token against the API without touching your follow graph.

Found a security issue? Please [report it privately](./SECURITY.md) rather than opening an issue.
Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).
Version history lives in [CHANGELOG.md](./CHANGELOG.md).

## v3.0.0

Full rewrite from a Kotlin/Spring Boot web app to a TypeScript + Ink TUI on npm.

- Browser OAuth replaced with a CLI-friendly token chain (env → config → `gh` → prompt)
- Whitelist persists across runs instead of being a per-request form field
- Bulk unfollow serializes at 1 req/s (was parallel coroutines) and adds live progress,
  cancellation, per-user failure reporting, and rate-limit detection with reset time
- Warns upfront when the token lacks unfollow permission

## License

MIT © [krkarma777](https://github.com/krkarma777)
