# Automatic Git persistence

[Main specification](../_main.md)

## Commit by default

Every successful Promptbook operation that changes versioned project content commits its own authorized changes by default. This includes initialization, adding/editing tasks, approved planning saves, templates, migration, saved configuration, repair/recovery changes and task execution, including Manager, Teacher, Fixer, discovery and work requested through Chatter. CLI, terminal, browser and API follow the same rule; a separate `--commit` is not required.

A logical operation is the boundary, not each file write or UI step. Every accepted human-facing message from User or an agent commits independently, as does chat creation. Messages inside one executing task join that task's single result commit. An internal TEAM consultation serving a conversation without an owning task uses an ordinary scoped authoring commit for the bounded exchange, not an unrelated task result. See [chats](chats.md).

A clean repository is clean again at completed operation boundaries; ongoing owned work can be temporarily dirty. Read-only commands, cancelled previews, no-ops and ignored runtime/session changes create no commits. Pause/resume/cancellation, stop/restart, browser recovery and viewer navigation are runtime-only unless the user explicitly saves versioned defaults. Do not version runtime files or secrets merely to commit every interaction. Task traces have separate [inclusion policy](trace-configuration.md), never permission to version `.ptbk/` or browser profiles. Push remains separately configured/authorized.

Report a versioned operation saved only after its commit succeeds. An engine must not claim a task between its authoring write and commit. Coordinate authoring with active ownership at safe boundaries; never fold concurrent add/chat work into another result. Failed persistence stays recoverable/pending, not completed or a reason to rerun successful model work.

## Commit messages

Every automatically created Promptbook commit starts with exact `PTBK: ` plus a meaningful summary: setup, authoring, results, maintenance, recovery and integration alike. Apply once even if a supplied subject already contains it. Do not rename tasks or rewrite existing history to add the prefix.

A result subject is `PTBK: <task title>`; the descriptive assignment and task-local rules remain the body, not replaced by technical metadata. Other subjects describe the operation, such as `PTBK: Initialize project`, `PTBK: Add task - Improve CSV export` or `PTBK: Update project configuration`. Add records creation, not execution or TASK DONE. Chat operations retain Chat-Name correlation under [chat rules](chats.md).

Task-attributable commits carry `Task-Name: <declared name>` and source/revision context, not a generated task ID or filename identity. Creation, assignment, results, repair, recovery, integration and recurrence retain the name valid for that operation. Explicit renames relate old/new names; multi-task commits distinguish executing work from generated follow-ups.

## Task results and ownership

Each completed task/occurrence has one result commit containing accepted changes, check/formatter changes, completion, follow-ups and eligible artifacts from **`traces/<task-file-basename>/`**, including finalized selected videos. This directory copies the actual source filename without final `.book`/`.md`, independently of Task-Name. Do not split a task into implementation/checker/trace commits. Failed attempts remain evidence, not successful result commits. Work without content improvements can commit its completion record.

Apply trace/video exclusions before staging; never force-add ignored evidence. Preserve available local traces regardless of Git inclusion. Finalize pre-commit artifacts; retain later commit/push events without embedding a commit's own SHA in its tree or making endless bookkeeping commits. Source/trace renames preserve provenance under [trace rules](traces.md).

Commit only attributable changes, preserving unrelated staged/unstaged content. No blanket staging, destructive cleanup/stashing, history rewriting or force-pushing to manufacture a clean tree. Respect hooks, signing and ignore rules. Validate committed content; unexpected post-check edits need reconciliation. A user's dirty repository is not silently adopted by another operation.

Start may refuse unrelated dirty initial state. Afterwards it manages its own pending writes and interruptions rather than treating every owned change as fatal. Ambiguous ownership blocks unsafe progress while controls remain available; intentionally ignored traces are not such a blocker.

Publish task-source updates atomically. Transient Windows sharing failures allow bounded retries of the same prepared update with ownership, confinement and original revision rechecked. Preserve concurrent edits and never delete a destination merely to force replacement. Exhaustion preserves work without rerunning agents or false completion.

## Explicit uncommitted mode

`--no-commit` disables automatic commits for the invoked mutating workflow and its spawned work, including init's service, not another owner or future invocation. `--commit` spells the default; contradictory flags fail before writes. No-commit is a deliberate policy, not an automatic response to a Git failure.

Show uncommitted mode and distinguish saved/checked-but-uncommitted work from commits. Preserve checks, declared names, source revisions, ownership, traces and recovery without repeating accepted work for lacking a SHA. A no-commit engine can process its proven owned changes, not adopt unrelated edits. Returning to committed mode requires reconciliation rather than a surprise aggregate commit.

Retain `--git-changes fail|ignore|continue`: refuse unrelated dirty state by default, retain it with ignore, or resume one proven interrupted task with continue. No option transfers unknown ownership. No-commit permits its own writes while existing dirt follows policy; it conflicts with isolation and automatic pull/push. Never invent a SHA. Authoring opt-out warns that later default start may require a user commit.

Respect configured Git identity/signing, including `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` and `CODING_AGENT_GPG_KEY_ID`; report effective identity on fallback to Git configuration.

A full revert reverses result/completion together when both were committed; it can remove a task created there rather than reopen it. Git does not undo browser/external effects. Preserve their provenance and never repeat them solely because a completion stamp disappeared.

## Acceptance outcomes

Add an unrouted task to a clean project and start: source commits first, Manager assigns and work continues without manual Git. Verify one PTBK prefix and meaningful name-correlated subjects. Concurrent authoring/results keep separate ownership. Human messages commit individually; task-internal TEAM joins its result; conversation-only consultation is a scoped authoring operation. Test trace/video policy and literal source-based evidence paths, unrelated staging, failing hooks/signatures, no-ops and no-commit. Runtime controls/navigation create no commits. Never commit excluded/unrelated data, fabricate persistence or rerun successful work after commit failure.

See [authoring](authoring.md), [checks](checks.md), [recovery](recovery.md), [Git synchronization](git-synchronization.md) and [isolation](isolation.md).
