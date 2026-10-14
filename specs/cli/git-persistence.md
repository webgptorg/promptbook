# Automatic Git persistence

[Main specification](../_main.md)

## Commit by default

Every successful Promptbook operation that changes versioned project content commits its own authorized changes by default. This includes initialization, adding/editing tasks, approved planning saves, templates, migration, saved configuration, repair/recovery changes and task execution, including Manager, Teacher and discovery work. The rule is the same through CLI, terminal, browser and API. A separate `--commit` is not required.

A logical operation is the commit boundary, not each file write, UI step or model turn. In the default workflow, a clean repository is clean again at a completed operation boundary; ongoing task work may be temporarily dirty. Read-only commands, cancelled previews, no-op operations and changes only to ignored runtime/session state create no empty commits. Do not version runtime files or secrets just to commit every interaction. Push remains a separate explicit/configured policy.

Only report a versioned operation as successfully saved after its commit succeeds. A running supervisor must not claim a task source in the interval between an authoring write and its commit. Coordinate CLI/UI authoring with active task ownership at a safe boundary; do not fold a concurrent add into another task's result. A failed commit preserves recoverable work and reports pending persistence, not successful completion or permission to rerun successful model work.

## Commit messages

Every commit automatically created by Promptbook starts with the exact prefix `PTBK: `, followed by a meaningful summary. This applies to initial/setup, authoring, task-result, maintenance, recovery and integration commits, regardless of agent or harness. Apply the prefix once, including when a supplied subject already has it. Do not rename tasks or rewrite existing history to add it.

A task-result subject is `PTBK: <task title>`; its descriptive assignment, including task-local rules, remains the body. Preserve that correspondence rather than substitute execution metadata. Other operations describe the action, for example `PTBK: Initialize project`, `PTBK: Add task - Improve CSV export` or `PTBK: Update project configuration`. Optional body details explain the scoped changes. An add commit records task creation, not execution or TASK DONE.

## Task results and ownership

With automatic commits, each completed task or recurring occurrence produces one result commit. It contains the task's accepted changes, check/formatter changes, completion stamp and newly generated follow-up definitions. Do not split one task into implementation and checker commits. Failed attempts remain recoverable evidence, not completed task commits. Even work needing no content improvement can commit its completion record.

Commit only attributable changes, preserving unrelated staged and unstaged work. Never blanket-stage, destructively clean, automatically stash, rewrite history or force-push to manufacture a clean tree. Respect hooks, signing and ignore rules. Validate the content being committed; unexpected edits after checking require reconciliation. A user-edited dirty repository remains user-edited, not silently adopted by an unrelated operation.

Start may refuse an unrelated dirty initial workspace. After startup it manages its own pending writes and recovers interruptions rather than treating every owned change as a fatal dirty-tree error. An ambiguous ownership boundary blocks unsafe progress while the supervisor stays available.

Publish task-source updates atomically. Transient Windows file-sharing failures may trigger bounded retries of the same prepared update, with ownership, path confinement and the original revision rechecked each time. Preserve concurrent edits and never delete the destination to force replacement. Exhausted retries preserve accepted work without rerunning the agent or recording false completion.

## Explicit uncommitted mode

`--no-commit` explicitly disables automatic commits for the invoked mutating workflow, including init, authoring, run and start and work they spawn. It does not silently change a different running process or future invocation. `--commit` remains an explicit spelling of the default; contradictory flags fail before writes. The normal rules above and elsewhere describe the default; this opt-out is the deliberate exception, not an automatic response to a Git failure.

Show uncommitted mode in the outcome/live status and distinguish saved or checked-but-uncommitted results from commits. Preserve checks, source revision checks, ownership and completion/recovery records; do not repeatedly execute accepted work merely because it has no commit. A no-commit start may process its provably owned changes without rejecting them solely for lacking a commit. It does not gain ownership of unrelated edits or task sources. Switching back to ordinary committed operation requires reconciling pending changes, never a surprise aggregate commit.

Preserve `--git-changes fail|ignore|continue`: refuse unrelated dirty state by default, retain it under ignore, or resume exactly one proven interrupted task under continue. No option transfers ownership of unknown changes. `--no-commit` alone permits its own new writes; pre-existing dirty state still follows that policy. It conflicts with isolation and requested automatic pull/push. Never invent a SHA for uncommitted work. An authoring opt-out warns that a subsequent default start may require the user to commit that source.

Respect configured Git identity/signing, including `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` and `CODING_AGENT_GPG_KEY_ID`; report the effective identity when falling back to Git configuration.

A full revert reverses both result and completion when both were in the commit. If the task was also created there, it may be removed instead of reopened. Git does not undo browser actions or other external effects; never repeat them solely because a completion stamp disappeared.

## Acceptance outcomes

From a clean ready project, add a task without routing and immediately start: add has committed its source, Manager can assign it, and execution continues without a manual Git step. All created commits have one PTBK prefix and meaningful subjects. Repeat during active work: authoring and task results retain separate ownership. Test an unrelated staged edit, a failing hook/signature, no-op commands and explicit no-commit mode; none silently commits unrelated changes, creates an empty commit or claims uncommitted results were persisted.

See [authoring](authoring.md), [checks](checks.md), [recovery](recovery.md), [Git synchronization](git-synchronization.md) and [isolation](isolation.md).
