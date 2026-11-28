[x] by Promptbook Developer on OpenAI Codex `gpt-6.1-sol` thinking `max` - Implementation in progress

[✨🧹] Commit changes made by Coder checks separately from implementation changes

Project checks are not necessarily read-only: lint fixes, formatters, cleanup scripts and generators can change files. Persist those changes in dedicated automatic commits, both before processing the queue and after implementing a task. Git history must distinguish what the implementation agent changed from what the checks changed, including when both modify the same file.

## Required behavior

-   Apply one shared policy to enabled pre-coding checks in both `--check-before yes-and-fail` and `--check-before yes-and-fix`, and to every post-implementation check attempt in the existing check-feedback workflow. Preserve `--check-before no` and the existing check-command selection/defaults.
-   When checks produce eligible changes, commit those changes separately. Use one shared message builder, following the existing `chore:` automation convention; the proposed subject is `chore: Automatically commit changes made by checks`. Include the phase, selected check command, associated task when applicable, and real check outcome in appropriate commit metadata/body or the existing trace.
-   Before the first implementation, finish committing check-produced changes before the next clean-working-tree guard. A repository which started clean and was modified only by the pre-coding check must not fail that guard merely because the check changed it.
-   After implementation, keep implementation edits out of the checks commit and checks edits out of the implementation commit. In the ordinary successful case there is an implementation commit and, only if the check changed something, a distinct checks commit. Do not create an empty checks commit.
-   The committed final tree must exactly match the retained, verified result. Do not discard generated files or formatter fixes to manufacture a clean tree. Include eligible additions, modifications, deletions, renames, executable-bit changes and binary changes, not just modified tracked text files.
-   With automatic commits enabled, a successful run which started clean finishes with no uncommitted Coder-owned changes, including task status and supported durable artifacts. Already permitted unrelated user changes remain untouched; preserving them takes precedence over claiming the entire repository is clean.

## Correct change attribution

-   Capture operation ownership before implementation and capture content/index boundaries immediately before and after each check, after its owned processes have stopped writing. Track the actual delta attributable to that phase, not just a list of filenames that happen to be dirty afterward.
-   A filename-only snapshot is insufficient when the agent edits a file and the formatter edits it again. The implementation commit must contain the agent's version, while the separate checks commit contains the transformation from that version to the checked version. Apply the same principle to a newly generated file that a later phase changes or deletes.
-   Use or extend the shared Git snapshot/commit-scope services with the content/tree information needed for this separation. An isolated index, staged trees, or another non-destructive snapshot strategy is acceptable; a second unrelated Git implementation is not.
-   Preserve the user's pre-existing staged and unstaged content, even in files also touched by checks. Do not absorb that content into either automatic commit. If a mixed change cannot be attributed safely, stop with a useful diagnostic and retain the work instead of guessing.
-   Serialize owned repository mutations across agent execution, checks, status writes and Git operations. Detect unexpected concurrent edits. A before/after comparison is not proof that an unrelated editor's change belongs to the checks.
-   Preserve provenance across failed-check, agent-repair and recheck cycles. Do not relabel agent-authored repairs as automatic check changes merely because they occur inside the check-feedback loop. Additional phase-specific commits are acceptable where needed to represent this chronology honestly.
-   Treat Coder-owned finalization and line-ending normalization explicitly. Do not leave a late normalization/status write uncommitted, and do not attribute unrelated bookkeeping to the check command. A narrowly scoped finalization-only commit is acceptable when needed for truthful status persistence.

## Outcomes, safety and lifecycle

-   A failing check may still produce changes. Once it finishes, persist safely attributable check changes separately under the same policy, while retaining the genuine failure result. `yes-and-fail` must still stop; `yes-and-fix` may continue to the existing repair workflow. Creating a commit must never turn a failed check into a pass.
-   Preserve the existing verification policy and bounded retry behavior. Do not weaken tests, skip configured checks, or remove the clean-tree preflight to make the new behavior pass.
-   Do not mark a task done before its selected checks genuinely pass and required local persistence succeeds. If intermediate local commits are needed, label their incomplete state honestly; do not publish a successful completion based on an unverified intermediate tree.
-   Keep check execution errors, check failures, commit/signing failures and remote synchronization failures distinct. A failed commit/push must not trigger another paid implementation attempt or duplicate an existing implementation/check commit. Retain enough information to resume persistence safely.
-   Respect the current `--no-commit`, dirty-tree handling, configured author/signing identity, remote-sync settings, cancellation and noninteractive policies. `--no-commit` means no automatic commits and therefore no guarantee of a clean final tree; report outstanding changes explicitly.
-   Never use indiscriminate staging, destructive reset/clean, automatic stashing, force-push, or dropping user changes. Do not disable Git hooks/signing as an undocumented workaround. Detect/report a hook that changes the verified content rather than declaring an unchecked tree successful.
-   In isolated execution, attribute and commit changes in the execution worktree and preserve the separate commits through integration. Do not squash check changes back into implementation changes. Keep durable traces and cancellation recovery in their existing supported locations.
-   On interrupted execution or an unrecoverable Git error, preserve partial work and report the real state. The clean-tree success guarantee is not permission to erase evidence or user files during failure cleanup.

## Shared implementation and integration

-   At the inspected baseline, `runCodexPrompts.ts` already has `PRE_CODING_CHECK_CHANGES_COMMIT_MESSAGE`, `captureCheckBeforeCommitScopeIfNeeded` and `commitCheckBeforeChangesIfNeeded`, but their capture is restricted to `yes-and-fix`. Generalize/extract this functionality instead of adding another competing path.
-   Integrate through the common check executor and feedback lifecycle used by `runPromptRound`. A wrapper around only the outer queue does not cover check retries or establish same-file attribution.
-   Keep check execution, phase-delta capture, commit persistence and UI reporting as separate responsibilities with typed results. Share the service between finite Coder runs and existing server execution; let the planned repair-only `coder fix` use it when available without making that unimplemented command a prerequisite.
-   Carry explicit selected-project and Git-root context into every snapshot, subprocess and commit. Preserve nested-project and `--isolate` behavior; do not rely on module-level working-directory state.

## Acceptance criteria

-   A clean fixture whose passing initial check formats a file produces one checks commit and then successfully starts its queued task in both enabled pre-check modes, without a dirty-tree crash.
-   A failing initial check that changes files produces a separately identifiable checks commit, then stops or enters repair according to the selected mode; it never reports successful validation.
-   A mock implementation and check modify the same line in the same file. Inspect commit trees/diffs, not just messages: implementation and check transformations are separate, and the final tree is exactly the checked result.
-   Cover changes to different files, created/deleted/renamed files, binary files, a no-op check and a check that reverts an earlier edit. No empty commit is created for an empty check delta.
-   A failed-check/agent-repair/recheck fixture retains correct provenance and bounded retries. Completion is recorded only after genuine success; persistence errors do not rerun the harness.
-   Fixtures with unrelated staged/unstaged work, overlapping edits, a failing Git hook/signature, rejected push, nested project and isolated worktree preserve user content and report the correct failure category. Successful integration preserves separate history.
-   A successful clean-start automatic-commit fixture has an empty final status; `--no-commit` and interrupted fixtures instead report their retained changes accurately. Use deterministic local mock checks/harnesses and temporary Git repositories, not paid model calls.

## Context and documentation

-   Inspect [pre-coding orchestration](../scripts/run-codex-prompts/main/runCodexPrompts.ts), [round finalization](../scripts/run-codex-prompts/main/runPromptRound.ts), [check feedback](../scripts/run-codex-prompts/checks/runPromptWithCheckFeedback.ts), [commit scopes](../scripts/run-codex-prompts/git/coderCommitScope.ts), [commit execution](../scripts/run-codex-prompts/git/commitChanges.ts), and [isolated rounds](../scripts/run-codex-prompts/isolation/runIsolatedPromptRound.ts).
-   Extend, rather than duplicate, the earlier [pre-coding check changes requirement](2026-08-0290-ptbk-coder-commit-the-test.md). Coordinate with [check terminology](2026-09-0510-ptbk-coder-check-terminology.md) and [repair-only Coder](2026-09-0520-ptbk-coder-fix-checks-only.md).
-   Keep the implementation DRY and responsibilities small. Update [Coder workflow documentation](../scripts/run-codex-prompts/README.md), relevant CLI help and tests, and add the implemented changes to the [changelog](../changelog/_current-preversion.md).


