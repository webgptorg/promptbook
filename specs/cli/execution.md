# Task execution lifecycle

[Main specification](../_main.md)

One project engine executes eligible background tasks and conversational work concurrently under the shared [capacity and per-file ownership contract](concurrency.md). `execution.maxConcurrentWork` defaults to five active units in total. Assignment, teaching, bootstrap, repair and goal-enquiry work use ordinary capacity, not an extra unbounded worker. Chat and its necessary routing/consultations remain eligible during scheduling pause. All work uses one working tree/current branch; dashboards request controls rather than executing their own agenda.

Select eligible work only while lifecycle state is `running`. Before each claim, refresh configuration/version and `.env`, check current enabled/usable tools and actual task constraints, and perform the required opt-in synchronization attempt. A failed remote attempt does not itself block work. Missing resources leave the service running with an explicit tool wait. Establish current source, normalized [task name](task-identity.md) and actual execution context.

Perform work, verify outcome and applicable real checks, prepare completion/follow-ups, attempt pre-commit synchronization safely and commit the accepted result. An informational check placeholder is not real validation evidence. Record actual agent, named tool instance/variant, model/thinking selection, actions/checks/outcomes, available harness output, scoped chats and attributable browser recordings in the [literal source-filename trace directory](traces.md).

The registry remains live during work. Newly added/enabled tools can be used at the next appropriate selection. An already acquired tool affected by a confirmed configuration change may retain its original context under [tool runtime](tool-runtime.md); do not freeze the whole list or restore an old configuration at completion. Tool/normalization commits can occur independently during the task and must not absorb its unfinished changes.

A task may change project materials, agents and other tasks. Accepted changes, completion, generated follow-ups and eligible evidence retain task/occurrence correlation through [smart, debounced Git persistence](git-persistence.md). Completion remains distinguishable from partial work and from other tasks even when compatible operations share a commit. Follow-ups get distinct readable names/source-based traces; Teacher learning runs as its own later task. Init has no separate inline bootstrap execution path. Preserve intervening scoped commits and reconcile shared-file changes before validation/persistence.

Failed real checks cause bounded repair/recheck, not false completion. Persistence retries resume the right phase; failed push never repeats accepted work/effects. Human-waiting/recovery tasks remain unfinished with evidence preserved. Problems use the shared [automatic repair](../concepts/automatic-repair.md) and ordinary Fixer, not another worker or communication channel.

After completion, claim further work only if lifecycle still permits it. Pausing/stopping drain or checkpoint current work without starting follow-ups. Cancelling/replacing pending intent does not restart the task. Force stop interrupts owned execution without false completion and retains available recovery evidence. See [service lifecycle](service-lifecycle.md).

Checkpoint a blocked task and release safe resources/capacity so independent work can proceed; retain any still-required file ownership visibly. Never mix unresolved edits into another result. A human wait is not permission to discard work. Start keeps supervising empty queues and recoverable/resource waits. Shared unsafe ownership blocks affected work, not automatically the whole engine; a network synchronization failure alone does not. File-lock deadlocks are explicitly [known and deferred](known-limitations.md).

See [checks](checks.md), [Git persistence](git-persistence.md), [Git synchronization](git-synchronization.md), [recovery](recovery.md), [traces](traces.md) and [task origins](task-origins.md).
