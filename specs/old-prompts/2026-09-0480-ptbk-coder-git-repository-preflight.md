[x] by Promptbook Developer on OpenAI Codex `gpt-6.1-sol` thinking `max` (ChatGPT account) - Implementation ~$0.7105 an hour; Testing 3 minutes

[✨🌱] Ensure workspace-dependent Coder commands check for a Git repository, and initialize Git automatically through `ptbk init` and `ptbk coder init`.

```bash
ptbk init
ptbk coder init
ptbk coder run --harness openai-codex
```

-   Implement this prerequisite before [the unified workspace Agent Server](2026-09-0490-ptbk-server-unified-workspace-agent-server.md). Do not implement the server redesign in this task.
-   Git must be an explicit, shared workspace precondition rather than an incidental error discovered when a command eventually tries to commit or pull.
-   All workspace-dependent `ptbk coder` actions must use the same detection and initialization policy. Disabling commits must not bypass repository detection.

## Shared repository detection

-   Inventory the command registrations and classify their actions as initialization, read-only/preview, or potentially mutating. Include authoring, planning, generation, execution, server startup, verification, and archival operations wherever those actions exist. Verification that updates PRD statuses is not read-only.
-   Resolve the requested project directory once and discover its enclosing Git working-tree root using Git itself. Do not merely check whether `<cwd>/.git` is a directory.
-   Support invocation at the repository root, inside a project subdirectory, and inside a linked worktree or submodule whose `.git` is a file. An existing parent repository satisfies the precondition; never create an accidental nested repository.
-   Keep the project directory and Git root distinct. Finding an enclosing monorepo must not redirect the requested project's agents, prompts, or initialization artifacts into a different project.
-   A newly initialized repository with no commits is valid. Do not require `HEAD` to exist merely to detect a repository or capture its initial change scope.
-   Distinguish a missing repository from a missing Git executable, inaccessible/corrupt Git metadata, a bare repository, and permission or ownership errors. Only the genuinely missing-repository case may offer initialization. Never work around an ownership error by globally marking arbitrary paths safe.
-   Run the preflight before project mutations, automatic pull/commit/push, harness execution or installation, database creation, or server startup. Help, version, and command-usage errors must remain available without Git or a project and must not trigger setup.

## Behavior outside a Git repository

-   For an ordinary potentially mutating command in an interactive terminal, show the resolved target directory and ask whether to initialize a Git repository there. Only an affirmative answer runs `git init`; verify success, then continue the original command without requiring a second invocation.
-   Declining, cancelling, or failing initialization must stop that mutating command with an actionable diagnostic and a nonzero exit status, before its normal side effects begin. Do not continue with only a warning and silently lose the promised Git safety.
-   With `--no-questions`, do not ask and do not treat the flag as consent to initialize Git. A mutating command without a repository must fail immediately and suggest `ptbk init`, `ptbk coder init`, or `git init` as the recovery path.
-   Apply the same noninteractive behavior when stdin cannot provide an interactive answer, even without `--no-questions`. Never leave CI or a daemon waiting for input.
-   Read-only listing/inspection and true previews such as `--dry-run` still detect and warn about the missing repository, but remain usable without creating Git metadata or other project files. Do not turn a preview into an initialization wizard.
-   Preserve the existing distinction between required and optional questions in the shared questions helpers. This change is not permission for `--no-questions` to bypass unrelated safety checks.

## Explicit initialization commands

-   `ptbk coder init` must automatically initialize Git when its target is not already inside a valid Git working tree. The explicit initialization command is sufficient authorization: it must not ask an additional Git-initialization question, including when `--no-questions` is present.
-   Add the top-level `ptbk init` entrypoint through the same project initializer used by `ptbk coder init`, including automatic Git initialization. At the inspected baseline, top-level `init` is not registered; do not assume that an existing top-level handler already provides this behavior.
-   Reuse the existing initialization options, non-destructive scaffolding, and summary rather than creating a competing initialization implementation. Preserve current aliases such as `ptbk coder initialize`.
-   Complete and validate Git initialization before invoking initialization-time Git synchronization. In particular, `--auto-pull` or commit-scope capture must not run first and fail because the repository has not been created yet.
-   When Git already exists, report that it was reused and leave its history, remotes, branch, hooks, user configuration, and existing index untouched. Repeated initialization must be idempotent.
-   Do not stage or create an initial commit containing every pre-existing file. Repository initialization and committing generated artifacts are different operations; preserve the existing explicit commit/push options and scoped-commit rules.
-   Do not invent a remote, upstream branch, Git identity, signing key, or credentials. A local repository without a remote is valid. Missing prerequisites for explicitly requested remote synchronization should produce the existing actionable diagnostic, not be mistaken for missing Git.
-   Preserve customized Books, prompts, README files, package scripts, environment values, and ignore rules. Any initialization failure must explain which setup steps completed without claiming that the command succeeded.

## Architecture and scope

-   Introduce or extract one shared repository-context/preflight utility and use it from the registered actions. Avoid copied `git rev-parse`, `git init`, question handling, and error translation across command files.
-   Keep command policy separate from low-level detection so explicit init, a mutating action, and a read-only preview share the implementation without sharing inappropriate side effects.
-   Integrate with the existing questions options, project bootstrap, Git synchronization, and commit-scope helpers. In particular, reconcile the current assumption in `$startCoderGitSync` that commands without commits need not inspect Git; Git mutation may remain disabled while preflight detection is still required.
-   Pass the resolved project/repository context to downstream operations instead of rediscovering inconsistent roots. Keep dependencies suitable for the packaged CLI and avoid loading heavy server or harness runtimes merely to show help.
-   Do not change task selection, agent/harness defaults, model behavior, verification rules, or automatic commit/pull/push defaults of `coder run` as part of this prerequisite.
-   Expose the utility for the subsequent `ptbk server` implementation and its `ptbk coder server` alias. Do not create another server-specific Git guard later.

## Acceptance criteria

-   In a temporary non-Git project, an interactive mutating Coder command asks once; accepting initializes the correct directory and resumes the command, while declining or cancelling leaves project files untouched and does not launch a harness.
-   Outside Git, both `--no-questions` and a non-TTY invocation fail promptly for mutating commands without prompting, initializing Git, installing a harness, or writing project state. Read-only and dry-run cases only warn and retain their existing useful output.
-   Both `ptbk init` and `ptbk coder init --no-questions` create a valid repository in a fresh project, reuse it on a second invocation, and preserve existing user-owned files. Test Git initialization separately from optional harness installation.
-   Tests cover a normal repository, an unborn branch, a nested project inside a repository, linked worktrees, a submodule, a bare repository, missing Git, invalid Git metadata, and initialization permission failures. No case accidentally initializes the parent directory or a nested repository.
-   Command-level tests demonstrate that the shared guard runs before side effects for every applicable action, including paths without commit options. Global and subcommand help/version tests show no setup or repository writes.
-   Existing staged and unstaged user changes remain untouched; explicit init with commit options commits only eligible initialization artifacts rather than absorbing unrelated files.
-   Use temporary repositories and mocked prompts/harnesses. Tests must not need network access, paid model calls, or changes to the developer's global Git configuration.
-   Smoke-test the installed CLI outside this monorepo so the new top-level entrypoint and shared helper are included in the published package.

## Context and related work

-   Inspect [top-level CLI registration](../src/cli/$initializePromptbookCliProgram.ts), [Coder registration](../src/cli/cli-commands/coder.ts), [Coder init](../src/cli/cli-commands/coder/init.ts), and [project initialization](../src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts).
-   Reuse [questions options](../src/cli/cli-commands/common/questionsCliOptions.ts), [Git synchronization](../scripts/run-codex-prompts/git/coderGitSync.ts), and [commit-scope handling](../scripts/run-codex-prompts/git/coderCommitScope.ts). Check [run](../src/cli/cli-commands/coder/run.ts) and [the existing server command](../src/cli/cli-commands/coder/server.ts) for startup ordering.
-   Coordinate with [generated prompts documentation](2026-09-0460-ptbk-coder-init-prompts-readme.md) and [legacy cleanup](2026-09-0470-remove-legacy-pipelines-and-clean-repository.md). Do not restore retired pipeline commands to implement top-level `init`.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Update CLI help, initialization summaries, the generated workflow README, and the [Coder landing website](../apps/coder-landing) to explain the behavior and noninteractive recovery.
-   Add the implemented changes into the [changelog](../changelog/_current-preversion.md).

