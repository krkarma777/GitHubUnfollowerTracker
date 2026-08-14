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
  cli.tsx                  flag dispatch, TTY guard, renders <App/>
  core/                    pure logic — unit tested, no React
    args.ts                argv → mode (tui / dry-run / help / version)
    report.ts              read-only follow-graph report + text/JSON formatting
    relations.ts           set diff: mutuals / notFollowingBack / fans
    config.ts              ~/.config/ghut/config.json (0600)
    auth.ts                token chain: env → config → gh CLI (prompt is the UI's fallback)
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

The test suite never hits the network, so most work needs nothing here. But if you're changing
`github.ts` or `unfollow-runner.ts`, you may want to confirm your token actually reaches the API.

**First, run the tool against a scratch config** so you don't touch your real settings:

```bash
GHUT_CONFIG_DIR=$(mktemp -d) node dist/cli.js
```

### Checking your token can unfollow

Unfollowing needs `user:follow` (classic token) or **Followers: read and write** (fine-grained).
With the GitHub CLI, add it with `gh auth refresh -s user:follow` — the default `gh` scopes do
**not** include it.

To confirm the write path works, target an account you **don't** follow. `DELETE
/user/following/{username}` is idempotent, so it returns `204` while changing nothing. The guard
below refuses to run the `DELETE` if you do follow the target:

```bash
T=$(gh auth token)
TARGET=octocat
API="https://api.github.com/user/following/$TARGET"
H_AUTH="Authorization: Bearer $T"
H_VER="X-GitHub-Api-Version: 2026-03-10"

status() { curl -s -o /dev/null -w '%{http_code}' -H "$H_AUTH" -H "$H_VER" "$@" "$API"; }

if [ "$(status)" = "404" ]; then
  echo "DELETE  -> $(status -X DELETE)"   # 204 = your token can unfollow
  echo "after   -> $(status)"             # 404 = nothing changed
else
  echo "You follow $TARGET — pick someone you don't follow."
fi
```

A `404` on the `DELETE` line means the token lacks permission, not that the user is missing.

**Never point this at someone you follow.** `DELETE` is irreversible and GitHub has no bulk
re-follow.

### Exercising the read path

`--dry-run` runs the whole pipeline — token resolution, pagination, relation diff, whitelist
filtering — and prints the result without issuing a single `DELETE`:

```bash
GHUT_CONFIG_DIR=$(mktemp -d) node dist/cli.js --dry-run
node dist/cli.js --json | jq .
```

This is the safe way to check a change to `github.ts`, `relations.ts`, or `report.ts` against your
real account.

### What this doesn't cover

Nothing exercises `GitHubClient.unfollow` or `runUnfollow` against the live API — those are covered
by the test suite with an injected client, and by the idempotent `DELETE` check above at the HTTP
level only.

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

Maintainers only.

1. Move `## Unreleased` in `CHANGELOG.md` to the new version with a date, and update the link
   definitions at the bottom
2. `npm version <major|minor|patch>` — commits and tags
3. `git push && git push --tags`

Pushing the tag triggers [`.github/workflows/release.yml`](./.github/workflows/release.yml), which
verifies the tag matches `package.json`, runs typecheck/tests/build, and publishes to npm. No
token, no 2FA prompt — the workflow authenticates with
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers) over OIDC, and npm attaches a
provenance attestation automatically.

Then `gh release create vX.Y.Z` with notes from the changelog.

### One-time setup

Trusted publishing has to be registered on npmjs.com before the workflow can publish — on the
package's **Settings → Trusted Publisher**, with:

| Field | Value |
|---|---|
| Organization or user | `krkarma777` |
| Repository | `GitHubUnfollowerTracker` |
| Workflow filename | `release.yml` |
| Environment | *(leave empty)* |

The workflow filename is matched exactly and is case-sensitive — renaming the file breaks
publishing until this setting is updated.

## Code of Conduct

Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).
