# Contributing

Thanks for your interest. This is a small, focused tool — contributions that keep it that way are
the most welcome kind.

## Getting set up

```bash
git clone https://github.com/krkarma777/GitHubUnfollowerTracker.git
cd GitHubUnfollowerTracker
npm install

npm test          # vitest — core logic + Ink UI
npm run typecheck # tsc over src/ and test/
npm run build     # tsc → dist/
node dist/cli.js  # run your build
```

Node.js >= 20 is required. Tests never hit the network, so no token is needed to develop.

## Architecture

The split that matters: **`src/core/` never imports from `src/ui/`.**

```
src/
  cli.tsx                  flag parsing, TTY guard, renders <App/>
  core/                    pure logic — unit tested, no React
    relations.ts           set diff: mutuals / notFollowingBack / fans
    config.ts              ~/.config/ghut/config.json (0600)
    auth.ts                token chain: env → config → gh CLI → prompt
    github.ts              Octokit wrapper, error classification, scope detection
    unfollow-runner.ts     paced bulk unfollow with abort + rate-limit handling
  ui/                      Ink components — thin, no business logic
```

Every IO seam is injectable: `new ConfigStore(dir)`, `resolveToken({env, execGhToken})`,
`new GitHubClient(octokit)`, `<App createClient={...}/>`. If you find yourself needing a network
call in a test, the seam is in the wrong place — say so in the issue.

## Working on a change

1. **Open an issue first.** It keeps design discussion out of the diff, and saves you writing code
   for an approach that won't be merged.
2. **Branch** — `fix/<slug>` or `feat/<slug>`.
3. **Write the failing test first.** Especially for bug fixes: a test that passes before your fix
   isn't testing the bug. Run it, watch it fail, then fix it.
4. **Open a PR** with `Closes #N` in the body.

## Testing against the real GitHub API

Be careful here. `DELETE /user/following/{username}` is irreversible — GitHub has no bulk
re-follow.

To exercise the unfollow path without destroying your own follow graph, target an account you
**don't** follow. The endpoint is idempotent, so it returns `204` and changes nothing:

```bash
T=$(gh auth token)
API="https://api.github.com/user/following/octocat"
H_AUTH="Authorization: Bearer $T"
H_VER="X-GitHub-Api-Version: 2026-03-10"

curl -s -o /dev/null -w '%{http_code}\n' -H "$H_AUTH" -H "$H_VER" "$API"          # 404 = not following
curl -s -X DELETE -o /dev/null -w '%{http_code}\n' -H "$H_AUTH" -H "$H_VER" "$API" # 204 = works
curl -s -o /dev/null -w '%{http_code}\n' -H "$H_AUTH" -H "$H_VER" "$API"          # 404 = nothing changed
```

Point the config at a scratch directory so you don't touch your real settings:

```bash
GHUT_CONFIG_DIR=$(mktemp -d) node dist/cli.js
```

A token needs `user:follow` (classic) or **Followers: read and write** (fine-grained) to unfollow.
With the GitHub CLI: `gh auth refresh -s user:follow`.

## Conventions

**Commits** — imperative mood, explain *why* in the body when it isn't obvious:

```
Fix 403 misclassification for fine-grained tokens

Permission-denied 403s were reported as rate limits, so users waited
for a limit that would never clear.
```

Don't add AI/tool attribution trailers.

**Code** — match the surrounding style. Comments explain *why*, not *what*; if a comment restates
the code, delete it. Prefer small files with one responsibility.

**Scope** — this tool manages your own follow graph, interactively. Features that automate
following or unfollowing without explicit confirmation are out of scope: GitHub's
[Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
name automated follow/unfollow as ranking manipulation.

## Releasing

Maintainers only:

1. Move `## Unreleased` in `CHANGELOG.md` to the new version with a date
2. `npm version <major|minor|patch>`
3. Push the tag — CI publishes to npm with provenance
4. Publish the GitHub Release with notes from the changelog

## Code of Conduct

Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).
