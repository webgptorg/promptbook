# Concurrent project work and file ownership

[Execution](execution.md) · [Configuration](configuration.md) · [Git persistence](git-persistence.md) · [Recovery](recovery.md)

One project engine coordinates concurrent work in the project's **one existing working tree and current branch**. It does not create task worktrees, choose branches or merge per-task branches. An already selected Git worktree remains a valid project directory; this is not permission to create more of them.

## Capacity and independent conversations

`ptbk.json.execution.maxConcurrentWork` is a positive integer, **5 by default**, limiting active task and chat work **together**, not five of each. A conversational turn, background task or independently executing consultation consumes capacity; nested routing/consultation must not secretly exceed the limit or occupy a parent slot while waiting for another unavailable slot. Idle chats, viewers, checkpointed human/Wallet/resource waits and queued work do not consume active execution capacity. Report active, waiting and queued work separately.

Different chats and tasks can progress independently up to this limit. No single project-wide chat queue serializes every thread behind a long answer or task. Several clients opening the same chat observe the same ordered conversation, not separate executions. Accept and persist additional user messages during an answer, retain source order and apply them at the next safe point; never discard or silently submit a duplicate turn. If capacity is full, show the real queue/wait while accepting input and keeping controls responsive.

The limit is refreshed with configuration. Raising it permits more eligible work; lowering it prevents excess new claims without killing already active work. Chat remains eligible during scheduling pause; background tasks and their queued follow-ups do not. Stop/force stop apply to **all** active work. See [service lifecycle](service-lifecycle.md).

## Per-file ownership

Different files can be edited concurrently. Conflicting work on the **same file** waits for its current owner; do not serialize the whole project just because any task is active. Resolve actual file identity consistently across aliases/paths and coordinate engine authoring, tools, chats, task edits, checks and Git operations through the same ownership model. Read-only inspection does not take a mutation lock.

Acquire ownership before an operation can change a file, including a file discovered partway through execution. Do not let two harnesses write the same file and hope to repair it afterwards. A task waiting for a conflicting file remains unfinished with a visible blocker and preserved work. On release, recheck its revision and prerequisites before continuing. Dependencies between tasks/chains remain real eligibility constraints even when capacity and files are available; parent grouping alone imposes no order.

Book appends and short shared metadata writes serialize at their actual mutation boundaries, not for an entire model turn. Thus two agents can contribute to a shared chat without each claiming the chat file for the duration of their unrelated task. Checks that read changing files must validate a coherent result; changes after validation require affected checks again.

External user edits are possible even while an operation owns a file. Preserve/reconcile those edits rather than restoring an old snapshot. The resulting commit includes the user's current changes to that operation's affected files, with accurate provenance; it does not stage unrelated project files or another active operation's unfinished changes. Secrets and ignored files remain excluded. See [Git persistence](git-persistence.md).

## Durable state and known limitation

Accepted messages and file changes are written promptly; Git batching never becomes the only copy of work. Track active ownership, pending commits and interrupted phases sufficiently to recover after force stop without mixing task results, duplicating messages or replaying external effects. Release or reconcile only ownership belonging to the verified old engine.

**File-lock deadlocks are a known, accepted limitation in this version.** Work can hold one file while waiting for another held by different work. Record the waits and keep unrelated work/controls available, but do not add deadlock detection, lock reordering or automatic cycle-breaking as a requirement now. This is distinct from invalid cyclic task dependencies. See [known limitations](known-limitations.md).

## Acceptance outcomes

Run independent tasks and conversational turns together: at most five active units by default; a configured value of one serializes them. A sixth waits visibly without blocking input. Two operations changing different files overlap; a same-file conflict waits and then revalidates. A user edits an affected file during work: retain the edit in the relevant commit while leaving unrelated files/staging untouched. Exercise shared-chat appends, task dependency chains, live limit changes and pause/stop with several active units. Force stop before a debounced commit and recover the saved files/messages and correct phases without false completion. Document a file-lock cycle without claiming it is automatically solved.
