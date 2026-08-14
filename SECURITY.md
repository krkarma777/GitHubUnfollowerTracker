# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 3.x | Yes |
| 2.x and earlier | No — the Kotlin/Spring Boot application is unmaintained |

## Reporting a vulnerability

**Please don't open a public issue.**

Report privately through GitHub Security Advisories:

**https://github.com/krkarma777/GitHubUnfollowerTracker/security/advisories/new**

Please include the version, what an attacker could achieve, and steps to reproduce. A proof of
concept helps, but never include a real token — describe its type and scopes instead.

Expect an initial response within 7 days. If a fix is warranted, you'll be credited in the
advisory and the changelog unless you'd rather not be.

## What's in scope

This tool holds a GitHub token with write access to your follow graph. Issues worth reporting:

- Token disclosure — leaking into logs, error messages, terminal output, or files readable by
  other users
- Weakened permissions on `~/.config/ghut/config.json` (it should be `0600`)
- Sending the token anywhere other than `api.github.com`
- Unfollowing without the documented explicit confirmation
- Command injection through usernames, config values, or the `gh` CLI invocation
- Dependency vulnerabilities that are actually reachable from this code

## What's out of scope

- Anything requiring an attacker to already have write access to your machine or your config file
- GitHub's own rate limits, API behavior, or account security
- The consequences of unfollowing people you chose to unfollow
- Vulnerabilities in dependencies with no reachable path from this package

## Design notes

For context when assessing a finding:

- The token is stored at `~/.config/ghut/config.json` with mode `0600`, in a directory created
  with mode `0700`
- The token is only ever sent to `api.github.com` via `@octokit/rest`
- The `gh auth token` fallback uses `execFile` — no shell, so no metacharacter injection through
  arguments
- No log files are written, and the token is never printed to the terminal (the prompt masks input)
