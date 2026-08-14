# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `--dry-run` prints exactly who a bulk unfollow would touch and exits without changing anything
- `--json` emits the same report as machine-readable JSON (implies `--dry-run`)
- Both flags work without a TTY, so the tool is usable from scripts and CI
- Unrecognised options now exit with code 2 instead of silently launching the TUI

## [3.0.0] - 2026-08-14

Complete rewrite: the Kotlin/Spring Boot web application is now a TypeScript npm package with an
interactive terminal UI. Published as [`github-unfollower`](https://www.npmjs.com/package/github-unfollower);
the installed binary is `ghut`.

### Added

- Interactive terminal UI built with [Ink](https://github.com/vadimdemedes/ink) — dashboard,
  follower/following/fans lists, whitelist, and bulk unfollow
- Persistent whitelist stored in `~/.config/ghut/config.json`, replacing v2's per-request form field
- Token resolution chain: `GITHUB_TOKEN` → saved config → `gh auth token` → interactive prompt
- Upfront warning when the resolved token lacks permission to unfollow, detected from the
  `x-oauth-scopes` header
- Live progress, `esc` cancellation, and per-user failure reporting during bulk unfollow
- Retryable error screen for network and server failures
- `--help` and `--version` flags
- `GHUT_CONFIG_DIR` environment variable to relocate the config (used by tests)

### Changed

- Authentication moved from browser OAuth to a CLI token chain — no OAuth app registration, no
  server, no browser
- Bulk unfollow is serialized at roughly one request per second, replacing v2's parallel
  coroutines, per GitHub's secondary rate-limit guidance for mutating requests
- Requests pin `X-GitHub-Api-Version: 2026-03-10`; unversioned requests silently fall back to
  `2022-11-28`

### Fixed

- Permission-denied `403` responses are no longer classified as rate limits. A fine-grained token
  without `Followers: write` returns `403` with the quota intact; the previous behavior aborted the
  whole run and told the user to wait for a limit that would never clear
- A rate-limited target is now reported instead of vanishing from both the success and failure
  counts
- A cancelled bulk unfollow is distinguishable from a completed one
- Non-authentication load failures no longer route to the token prompt, which blamed the user's
  credentials for network problems
- A pasted token is validated before being written to disk
- Config file permissions are re-tightened to `0600` on save, not only at creation

### Removed

- The Kotlin/Spring Boot application, its OAuth flow, and its web endpoints. There is no migration
  path — install the npm package.

[Unreleased]: https://github.com/krkarma777/GitHubUnfollowerTracker/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/krkarma777/GitHubUnfollowerTracker/compare/v2.1.0...v3.0.0
