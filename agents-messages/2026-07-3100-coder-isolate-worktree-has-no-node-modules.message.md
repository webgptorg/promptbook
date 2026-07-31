# `ptbk coder run --isolate` gives the isolated worktree no `node_modules`

Found while fixing the `--isolate` `Filename too long` crash (see [`changelog/_current-preversion.md`](../changelog/_current-preversion.md)). The crash itself is fixed and the worktree is now created, used and removed correctly — this message is about a **second, independent** limitation that the original prompt did not cover, so it was deliberately not implemented.

## What happens

[`copyCoderIsolationEnvironment.ts`](../scripts/run-codex-prompts/isolation/copyCoderIsolationEnvironment.ts) defines "its own isolated environment" as exactly one file: `.env`. Everything else that is git-ignored is missing from a fresh worktree — most importantly `node_modules`.

[`runIsolatedPromptRound`](../scripts/run-codex-prompts/isolation/runIsolatedPromptRound.ts) runs the whole round with `projectPath: worktree.worktreePath`, so both the coding agent and the `--test` verification command execute inside that dependency-less checkout. A run such as

```bash
ptbk coder run --harness claude-code --agent agents/coding/developer.book --test "npm run test-for-ptbk-coder" --isolate
```

therefore reaches verification with no installed dependencies. `npm run test-for-ptbk-coder` fails on the missing local binaries, the failure is fed back to the agent as test feedback, and the round burns its retries on a problem the agent cannot fix by editing code.

## Why it was not fixed here

The prompt asked only to fix the error that prevented the worktree from being created, and the changelog entry of the `--isolate` feature already documents `.env` as the copied environment. Adding dependency provisioning is a design decision, not a bug fix, and the options differ a lot in cost:

-   **Copy `node_modules`** — a true snapshot, but this repository has tens of thousands of files in it, which would dominate the runtime of every single isolated task.
-   **Junction / symlink `node_modules` into the worktree** (`fs.symlink(target, path, 'junction')` on Windows) — near-free and correct as long as the worktree is checked out from `HEAD` of the same branch, which it always is. It does mean the "isolated" environment shares installed dependencies with the project.
-   **Run `npm ci` inside the worktree once per round** — fully isolated and correct, but adds minutes per task.
-   **Make it explicit** — a `--isolate-install <command>` style option, so the choice is the user's.

## Suggested next step

Pick one of the strategies above (the junction is the pragmatic default) and extend `copyCoderIsolationEnvironment` into a small provisioning step, keeping `.env` handling as it is today. Until then, `--isolate` is only reliable without `--test`, or with a `--test` command that does not need installed dependencies.

## Smaller related observation

While an isolated worktree exists, `jest-haste-map` in the **original** project reports `Haste module naming collision` for every `package.json` duplicated inside `.promptbook/coder-isolation-worktrees/…`. Jest's `testPathIgnorePatterns` already excludes `<rootDir>/.promptbook/`, but the haste map still scans it. Adding `.promptbook` to `modulePathIgnorePatterns` in [`jest.config.js`](../jest.config.js) would silence it.
