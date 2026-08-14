# GitHub Unfollower Tracker

Interactive terminal UI (TUI) to see who isn't following you back on GitHub, manage a whitelist,
and bulk-unfollow non-followers — right from your terminal.

> v3.0.0 is a full rewrite: the old Kotlin/Spring Boot web app is now a TypeScript npm package
> built with [Ink](https://github.com/vadimdemedes/ink).

## Usage

```bash
npx github-unfollower-tracker
# or install globally
npm install -g github-unfollower-tracker
ghut
```

Requires Node.js >= 20 and a real terminal (TTY).

## Authentication

A GitHub token with the **`user:follow`** scope is resolved in this order:

1. `GITHUB_TOKEN` environment variable
2. Token previously saved in `~/.config/ghut/config.json`
3. `gh auth token` — if you're logged in with the [GitHub CLI](https://cli.github.com), it just works
4. Interactive prompt — paste a [personal access token](https://github.com/settings/tokens); it's
   saved to the config file with `0600` permissions

## Features

- **Dashboard** — followers / following / mutual / not-following-back / fans counts at a glance
- **Not following you back** — the list that matters, with per-user unfollow
- **Followers / Following** — full paginated lists
- **Whitelist** — mark users (★) to protect them from unfollowing; persisted across runs
- **Bulk unfollow** — unfollow everyone who doesn't follow back (whitelist excluded), with
  explicit confirmation, live progress, bounded concurrency, and rate-limit-aware early stop

## Keybindings

| Key | Action |
|---|---|
| `↑` `↓` | Move cursor |
| `enter` | Select menu item |
| `u` | Unfollow highlighted user |
| `w` | Toggle whitelist for highlighted user |
| `y` / `esc` | Confirm / cancel bulk unfollow |
| `esc` | Back to dashboard |
| `q` | Quit (from dashboard) |

## Development

```bash
npm install
npm test        # vitest unit tests (core logic)
npm run build   # tsc → dist/
node dist/cli.js
```

## v3.0.0 Release Notes

- Full rewrite from Kotlin/Spring Boot web app to a TypeScript + Ink TUI distributed on npm
- OAuth web login replaced with a CLI-friendly token chain (env var → saved config → gh CLI → prompt)
- Whitelist is now persistent (config file) instead of a per-request form field
- Bulk unfollow keeps v2's concurrency but adds live progress, cancellation (esc), per-user
  failure reporting, and rate-limit detection with reset time

## License

MIT
