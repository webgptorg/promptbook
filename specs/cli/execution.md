# Task execution lifecycle

[Main specification](../_main.md)

One project engine executes eligible background tasks and conversational work concurrently under the shared [resource and per-file ownership contract](concurrency.md), without a fixed combined count limit. Each agent holds one unfinished started task; assignment, teaching, bootstrap, repair and goal-enquiry use normal ownership and real resources, not a competing scheduler. Chat and its necessary routing/consultations remain eligible during scheduling pause. All work uses one working tree/current branch; dashboards request controls rather than executing their own agenda.

[System tasks](system-tasks.md) use these same scheduling/lifecycle/recovery mechanisms with their applicable definition, executor and conditions. The source/agent/harness/filename details below describe ordinary source-backed work; they do not require a deterministic system task to invent a Book, agent, MODEL or trace basename. The actual task's meaningful checks and resulting scoped audit still apply.

Select eligible work only while lifecycle state is `running`. Before each claim, refresh configuration/version and `.env`, check current enabled/usable tools and actual task constraints, and perform the required opt-in synchronization attempt. A failed remote attempt does not itself block work. Missing resources leave the service running with an explicit tool wait. Establish current source, normalized [task name](task-identity.md) and actual execution context.

Perform work, verify outcome and applicable real checks, prepare completion/follow-ups, attempt pre-commit synchronization safely and commit the accepted result. An informational check placeholder is not real validation evidence. Record actual agent, named tool instance/variant, model/thinking selection, actions/checks/outcomes, available harness output, scoped chats and attributable browser recordings in the [literal source-filename trace directory](traces.md).

The registry remains live during work. Newly added/enabled tools can be used at the next appropriate selection. An already acquired tool affected by a confirmed configuration change may retain its original context under [tool runtime](tool-runtime.md); do not freeze the whole list or restore an old configuration at completion. Tool/normalization commits can occur independently during the task and must not absorb its unfinished changes.

A task may change project materials, agents and other tasks. Accepted changes, completion, generated follow-ups and eligible evidence retain task/occurrence correlation through [smart, debounced Git persistence](git-persistence.md). Each checked completion retains its scoped task-result commit; compatible conversation/authoring saves may batch without absorbing another active task's changes. Follow-ups get distinct readable names/source-based traces; Teacher learning runs as its own later task. Init has no separate inline bootstrap execution path. Preserve intervening scoped commits and reconcile shared-file changes before validation/persistence.

Failed real checks cause bounded repair/recheck, not false completion. Persistence retries resume the right phase; failed push never repeats accepted work/effects. Human-waiting/recovery tasks remain unfinished with evidence preserved. Problems use the shared [automatic repair](../concepts/automatic-repair.md) and ordinary Fixer, not another worker or communication channel.

After completion, claim further work only if lifecycle still permits it. Pause requests supported interruption/checkpoint of active task sessions; Stop finishes/checkpoints owned work and shuts down. Neither starts follow-ups or task continuations after acceptance. Cancelling/replacing pending intent does not restart the task. Force stop interrupts owned execution without false completion and retains available recovery evidence. See [service lifecycle](service-lifecycle.md).

Checkpoint a blocked task and release safe resources so independent work can proceed; retain any still-required file ownership visibly. Never mix unresolved edits into another result. A human wait is not permission to discard work. Start keeps supervising empty queues and recoverable/resource waits. Shared unsafe ownership blocks affected work, not automatically the whole engine; a network synchronization failure alone does not. File-lock deadlocks are explicitly [known and deferred](known-limitations.md).

See [checks](checks.md), [Git persistence](git-persistence.md), [Git synchronization](git-synchronization.md), [recovery](recovery.md), [traces](traces.md) and [task origins](task-origins.md).

External mutations additionally produce durable [action records](action-log.md) under `actions/<task-file-basename>/`, independent of trace inclusion and final task success. Save/commit performed effects promptly and reconcile uncertain outcomes before retry; reads/downloads create no actions.

## Session context and changing instructions

Work uses the existing adapter's [session lifecycle](harness-sessions.md). One task can have several attributed sessions and turns, each bound to actual account/model/ownership. A session is not a task, process or single response. Before an effect and final acceptance, reconcile current source and outstanding [task-control](task-control.md) amendments. Saving a change is not live delivery; receipt confirmation, affected checks and lifecycle govern continuation. A late old-revision result cannot bypass a newer accepted instruction.
