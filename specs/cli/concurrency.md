# Concurrent project work and file ownership

[Execution](execution.md) · [Configuration](configuration.md) · [Git persistence](git-persistence.md) · [Recovery](recovery.md)

One project engine coordinates concurrent work in the project's **one existing working tree and current branch**. It does not create task worktrees, choose branches or merge per-task branches. An already selected Git worktree remains a valid project directory; this is not permission to create more of them.

## Independent tasks and conversations

There is **no product-wide fixed limit of five active works**, nor a configurable shared task/chat slot pool. Each agent may own one started unfinished task and concurrently answer any number of chats. Several independent agents may each execute their task, including more than five at once. Actual host resources, provider/account quotas, declared permissions, dependencies and file ownership can constrain execution and must appear as their real waits; they must not silently recreate a five-slot queue.

Different chats and tasks progress independently. Several viewers of one chat observe the same ordered conversation, not separate executions. Accept/save follow-up messages while an answer is in progress, retain source order and reconcile input at a supported boundary without duplicate turns. Idle open sessions require no ongoing paid inference. Consultation recursion/time/output bounds remain meaningful but are not a global work-count limit.

Chat and its necessary routing/consultation remain eligible during task pause. New task work and automatic task continuations do not. Stop/force stop covers all owned work. See [service lifecycle](service-lifecycle.md) and [harness sessions](harness-sessions.md).

## One unfinished started task per agent

An executing agent holds at most **one started unfinished task**, including a task checkpointed for human input, Wallet, resources or another wait. A wait releases safe execution resources but does not free that agent's task reservation. Different agents may work in parallel; queue another task for a busy agent until the first is completed or explicitly cancelled/reassigned through ordinary task management. Selecting a different harness/account for the same agent does not create another task capacity.

The agent can still answer chat while its task is active or waiting, under the same authority and file ownership rules. Chat is a timely interaction with a present person; a task is durable longer-running work that may wait in a queue. A status reply or consultation does not start a second independent task or falsely complete the first. Restore this reservation before claiming tasks after restart. An agent with an outstanding notice also performs bounded [relevance checks](notifications.md#ownership-and-continuing-relevance) in its existing context, even while its task waits. These do not allocate a second task, free the original reservation or concurrently write through an already active incompatible session. Coalesce/serialize checks with its other work, release safe capacity between checks, and obey Pause for automatic checks.

## Per-file ownership

Different files can be edited concurrently. Conflicting work on the **same file** waits for its current owner; do not serialize the whole project just because any task is active. Resolve actual file identity consistently across aliases/paths and coordinate engine authoring, tools, chats, task edits, checks and Git operations through the same ownership model. Read-only inspection does not take a mutation lock.

Acquire ownership before an operation can change a file, including a file discovered partway through execution. Do not let two harnesses write the same file and hope to repair it afterwards. A task waiting for a conflicting file remains unfinished with a visible blocker and preserved work. On release, recheck its revision and prerequisites before continuing. Dependencies between tasks/chains remain real eligibility constraints even when resources and files are available; parent grouping alone imposes no order.

Book appends and short shared metadata writes serialize at their actual mutation boundaries, not for an entire model turn. Thus two agents can contribute to a shared chat without each claiming the chat file for the duration of their unrelated task. Checks that read changing files must validate a coherent result; changes after validation require affected checks again.

External user edits are possible even while an operation owns a file. Preserve/reconcile those edits rather than restoring an old snapshot. The resulting commit includes the user's current changes to that operation's affected files, with accurate provenance; it does not stage unrelated project files or another active operation's unfinished changes. Secrets and ignored files remain excluded. See [Git persistence](git-persistence.md).

## Durable state and known limitation

Accepted messages and file changes are written promptly; Git batching never becomes the only copy of work. Track active ownership, pending commits and interrupted phases sufficiently to recover after force stop without mixing task results, duplicating messages or replaying external effects. Release or reconcile only ownership belonging to the verified old engine.

**File-lock deadlocks are a known, accepted limitation in this version.** Work can hold one file while waiting for another held by different work. Record the waits and keep unrelated work/controls available, but do not add deadlock detection, lock reordering or automatic cycle-breaking as a requirement now. This is distinct from invalid cyclic task dependencies. See [known limitations](known-limitations.md).

## Acceptance outcomes

Run at least six independent agents' tasks together without a hidden sixth-work queue; one busy agent also answers multiple chats but never claims a second unfinished task. Show actual quota/resource waits. Two operations changing different files overlap; a same-file conflict waits and revalidates. Retain an external user's affected edit in its relevant commit, leaving unrelated files/staging untouched. Exercise shared-chat appends, task dependencies and task-only Pause/whole-engine Stop with several sessions. Recover saved files/messages, reservations and phases after force stop without false completion. Document a file-lock cycle without claiming it is automatically solved.
