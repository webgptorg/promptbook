[ ]

[✨🔧] Add ptbk coder fix: run the project's checks, repair their failures through the existing repair-PRD workflow, commit the result, and stop without processing the normal PRD queue.

```bash
ptbk coder fix --harness openai-codex
ptbk coder fix --harness openai-codex --check "npm run lint && npm run build && npm test"
ptbk coder fix --harness openai-codex --path ../my-project --agent ./agents/developer.book --context ./AGENTS.md
```

-   Implement after [shared CLI defaults](2026-09-0500-ptbk-cli-default-agent-path-and-context.md) and [check terminology](2026-09-0510-ptbk-coder-check-terminology.md), using [the shared Git preflight](2026-09-0480-ptbk-coder-git-repository-preflight.md).
-   This is a finite CLI command for check repair only. It is not another autonomous server, a queue runner, a PRD planning session, or a general-purpose refactoring command.
-   The intended flow is: run checks; when they fail, create one repair PRD and execute that repair with verification feedback; commit eligible changes; exit. Never proceed to other prompts before, during, or after the repair.
-   Reuse and extract the existing `coder run` pre-coding repair logic. Reimplementing that logic under a new command name is explicitly not acceptable.

## Command contract

-   Register `fix` in the existing `ptbk coder` command group and include it in help and packaged CLI exports/entrypoints.
-   Accept `--check <check-command...>` through the same command parsing/normalization as `coder run`. Omission selects `npm run check` in the resolved project; an explicit command overrides it without adding hidden extra validation commands.
-   Reuse the shared primary-agent, project-path, and context defaults: Developer, the invocation directory, and project AGENTS.md. Preserve explicit overrides and the existing harness/model/thinking/credit selection contract; do not conflate the Developer Book with a harness.
-   Validate configuration and Git requirements before mutating the project or executing a potentially mutating check. Missing/unconfigured checks produce an actionable setup error, not a false pass or permission to invent a new validation policy.
-   Always perform the initial check in a real fix invocation. Do not offer `--check-before no` or a mode that lets fix skip verification and start ordinary implementation. Its purpose is equivalent to the shared check-and-repair phase, not to a user-selected queue mode.
-   Reuse applicable execution controls and safety options such as `--no-questions`, `--no-ui`, `--preserve-logs`, explicit Git-change handling, and commit/remote-sync options. Do not expose queue priority, queue run limits, or keep-alive controls as a way to define the repair-only boundary.
-   Keep dry-run/help side-effect free. A fix dry-run describes the resolved command and possible repair workflow without executing checks, creating a repair PRD, installing a harness, invoking an agent, changing task statuses, or committing.

## Check, repair, verify, and stop

-   Run the selected check command first and collect its real exit status and useful output through the shared check executor. Handle tests, lint, type errors, and build failures uniformly as check failures.
-   If checks pass, do not create a repair PRD or start an agent. Do not install/update a harness, resolve paid quotas through a model call, or generate default agent artifacts merely to announce that an already healthy project passed.
-   Resolve and prepare the repair harness/Book lazily when a repair is actually needed, reusing the same services as run. A healthy project must be checkable even when no coding harness is installed; a failure requiring an unavailable harness must give a clear diagnostic without executing another task.
-   Checks may include formatters or generators which modify files. Capture their change scope before execution and reuse the existing handling for check-produced changes. When a passing check legitimately changes project files, commit only its eligible changes under the normal commit policy; do not fabricate a repair PRD or an empty commit.
-   On a genuine failed check, create one concrete repair PRD using the same authoring, naming, numbering, parsing, and status conventions as the runner's current pre-coding repair. Record the chosen check command and bounded, appropriately redacted failure output, with enough context for the repair to be reproducible.
-   The repair specification must say to fix the underlying check failures and nothing else. Do not instruct it to implement remaining coding prompts, add unrelated features, perform an opportunistic cleanup, or rewrite the project's intended behavior just to obtain a pass.
-   Reuse one shared repair-prompt builder for run and fix; parameterize the caller intent where necessary. The current builder mentions the remaining coding queue, so do not copy that continuation instruction into fix's repair.
-   Execute the exact returned repair selection directly through the shared single-round execution and check-feedback services. A higher-priority backlog item or an agent-targeted ordinary PRD must never replace that selection.
-   Rerun the same selected checks through the shared bounded feedback/retry flow until they pass or the existing retry policy is exhausted. Update the same repair task across attempts instead of generating a fresh PRD for each failed check attempt.
-   Do not weaken validation: no deleting assertions, disabling lint rules, removing checks from the aggregate, skipping the build, changing thresholds to hide failure, or forcing a successful exit code. Genuine corrections to faulty test/check code are permitted only when they preserve the intended validation and are explained by the defect.
-   Report success only after the selected checks genuinely pass and the requested persistence/commit steps succeed. A model's completion message alone is insufficient. Failed or cancelled repair remains accurately failed/interrupted with diagnostic artifacts preserved under the shared policy.
-   Once the repair phase finishes, whether it passes, fails, is cancelled, or has nothing to repair, exit. Do not enter an idle watcher or continue to the normal queue.

## Strict isolation from ordinary PRDs

-   Existing pending, failed, in-progress, completed, not-ready, and multi-section PRDs must not be executed, rewritten, reprioritized, archived, or marked by fix. Leave unrelated PRD status and content untouched.
-   Reading directory entries needed to allocate a safe repair filename is permitted; selecting work through the ordinary priority/next-task scheduler is not. The UI must describe the check/repair job rather than implying that ordinary queued jobs are about to run.
-   Do not implement fix as `run --limit 1`, as an option that happens to find the repair task first, by temporarily hiding/renaming ordinary prompt files, or by changing their priorities/statuses. These approaches do not enforce the requested boundary.
-   The command must work with an empty or absent prompts directory. Create only the missing structure needed for the actual repair artifact when a repair is required; do not seed unrelated boilerplates or require a ready normal PRD.
-   Do not let generic interrupted-task resolution resume an arbitrary `[^]` backlog item. Any supported resumption must identify a specific check-repair task and remain within this workflow; otherwise stop with an actionable recovery diagnostic.
-   Coordinate repository mutations and repair ownership with the existing shared workspace lock/claim mechanism, including the unified server's mechanism when implemented. Another worker must not claim the just-created repair while fix is executing it, and fix must not bypass a live worker's ownership.

## Extract and share, do not duplicate

-   At the inspected baseline, `runTestBeforeIfNeeded` is a private helper inside `runCodexPrompts.ts`. It orchestrates the initial check, check-produced changes, repair PRD creation, and `runPromptRound`. Extract the check-repair orchestration behind a reusable service with explicit project context and an explicit result.
-   `coder run --check-before yes-and-fix` and `coder fix` must invoke that same service. Keep the check executor, repair builder, feedback/retry execution, status attribution, artifacts, commit scopes, and error translation shared as well.
-   Separate the service from the general queue, queue snapshot loading, keep-alive loop, global pause state, and terminal rendering. Provide shared lifecycle/event hooks rather than requiring a fake queue to initialize UI or pretending one ordinary task is the fix session.
-   Preserve run's behavior: check-and-fail still stops before coding on failure; check-and-fix repairs first and then may continue to its selected ordinary queue. Fix's caller stops after the same repair service returns. This difference belongs in orchestration, not in two independently maintained repair engines.
-   Pass project paths through to checks, repair files, Book/context resolution, subprocesses, traces, and commits. Do not rely on changing global process cwd or importing a module whose prompt directory was fixed at load time.
-   Do not spawn a nested `ptbk coder run` process, copy the main loop, add another shell executor, or fork harness adapters to implement this command.
-   Keep command implementation within the CLI/shared Coder layer. Do not add a web UI, require a SQLite server, launch an Agent Server, or run unrelated migrations/deployments to repair local project checks.

## Git, outcomes, and lifecycle

-   Reuse the shared Git preflight and dirty-tree policy, including noninteractive behavior. `--no-questions` is not consent to initialize a repository or discard work. Explicit project-path selection must determine the Git scope.
-   Commit successful repair changes and their repair PRD/status with the same scoped-commit and configured author/signing behavior as run. Checks that make no changes must not cause empty commits. Respect supported `--no-commit` behavior and its shared validation constraints.
-   Preserve unrelated staged and unstaged work. Do not use `git add .`, destructive reset/clean, automatic stashing, force-push, or a broad commit of all changed files to make the fix succeed.
-   Pull/push remain explicit opt-ins, matching the finite run command rather than the autonomous server's defaults. A commit or push failure must be reported separately from check failure and must not trigger another paid repair attempt or duplicate an already-created commit.
-   Distinguish passed-without-repair, repaired-and-verified, unresolved check failures, setup/harness errors, cancellation, and commit/synchronization errors in the final CLI summary. Do not equate a failed push with failed validation, or claim the remote contains a commit that was not pushed.
-   Return zero for a successful no-repair or repaired invocation; unresolved failures, setup errors, requested Git-operation failures, and interruption use the shared non-success exit conventions. Avoid infinite retries on configuration/authentication errors.
-   Reuse cancellation, child-process cleanup, output controls, trace retention, and bounded retry/pacing policies. SIGINT/SIGTERM must stop only owned activity, preserve recoverable work, and never advance to another PRD during cleanup.

## Acceptance criteria

-   A fixture with passing checks launches no repair harness, creates no repair PRD, leaves ordinary prompt files unchanged, and exits successfully. A pure check produces no commit; a check which formats an eligible file follows the documented scoped-change policy.
-   A deterministic failing lint/build/test fixture creates one repair PRD, passes that exact task to the mock harness, reruns the selected check, commits the verified result, and exits without executing any pre-existing PRD.
-   Seed fixtures with multiple ready tasks, a higher-priority task, a task targeted at the same agent, failed/in-progress tasks, and a PRD that would make an obvious forbidden file change. None is executed or modified, both when initial checks pass and when repair succeeds or fails.
-   With an empty/missing prompts directory, a needed repair still runs and only its required artifact is created. Repeated check-feedback failures update one repair PRD and respect retry limits; cancellation and missing-harness cases never fall through to queued work.
-   Verify default and explicit check commands, Developer/path/context defaults, custom Books, non-TTY/no-question behavior, no-UI output, and no-side-effect previews. A healthy project's fix does not depend on an installed harness.
-   Git fixtures cover check-produced changes, a no-op, unrelated dirty/staged files, missing Git, an unborn repository, commit failure, a local bare remote, rejected push, and competing workspace ownership. Failures do not duplicate a repair or absorb unrelated files.
-   Shared-service regression tests exercise run's check-before modes and fix against the same mocked check/harness fixtures. Run may continue to its ordinary queue after successful repair; fix cannot. Assert this control-flow difference directly, not merely the number of rendered task cards.
-   The generated repair text and final output use check terminology and prohibit weakening validation. No passing result is recorded when the real selected command still fails.
-   Run relevant CLI/unit/integration tests, type checks, and an installed-package smoke test outside the monorepo. Use deterministic mock harnesses and temporary repositories; no paid model calls or remote deployment are required.

## Context and related work

-   Inspect [Coder registration](../src/cli/cli-commands/coder.ts), [run flags](../src/cli/cli-commands/coder/run.ts), [the existing private repair orchestration](../scripts/run-codex-prompts/main/runCodexPrompts.ts), and [single-round execution](../scripts/run-codex-prompts/main/runPromptRound.ts).
-   Reuse [initial checks](../scripts/run-codex-prompts/testing/runTestBefore.ts), [repair PRD creation](../scripts/run-codex-prompts/testing/createTestBeforeRepairPrompt.ts), [mode/default definitions](../scripts/run-codex-prompts/testing/TestBeforeMode.ts), [Git synchronization](../scripts/run-codex-prompts/git/coderGitSync.ts), and [commit scopes](../scripts/run-codex-prompts/git/coderCommitScope.ts). These are baseline paths; use their shared renamed equivalents after the check-terminology task.
-   Coordinate with [the unified workspace server](2026-09-0490-ptbk-server-unified-workspace-agent-server.md) only for reuse of shared execution and mutation ownership. Implementing or starting that server is not a prerequisite for using fix.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Update CLI help, the generated prompts/workflow README, and relevant [Coder documentation](../apps/coder-landing), clearly distinguishing fix from run and verify.
-   Add the implemented changes into the [changelog](../changelog/_current-preversion.md).
