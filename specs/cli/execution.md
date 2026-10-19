# Task execution lifecycle

[Main specification](../_main.md)

One project executes one task at a time, including assignment, teaching, bootstrap and goal-enquiry tasks. TEAM consultations remain part of that executing task. All entry points use the same lifecycle and acceptance rules. The [engine owns execution](process-modes.md); attached dashboards only observe or request shared controls.

Select eligible work only while the service is `running`, establish its current source, normalized [task name](task-identity.md) and actual execution context, perform the work, verify outcome/checks, prepare completion/follow-ups and commit the accepted result. Record actual agent/harness/model/thinking selection, actions/checks/outcomes, available harness output, linked task-scoped chats and enabled browser recording from the first attempt in the [literal source-filename trace directory](traces.md).

A task may change project materials, agents and other tasks. Its completion, accepted changes, newly generated follow-ups and eligible traces belong to one result commit correlated by `Task-Name`. Follow-ups receive distinguishable readable names and their own source-based trace locations. Learning later runs as Teacher's own task. Initial content creation/maintenance use this same mechanism; init does not execute a special bootstrap implementation.

Failed checks cause bounded repair/recheck, never unverified completion. Persistence/synchronization failure must not rerun successful work/effects blindly. Human-waiting or recovery work stays visibly unfinished with identity and attempts preserved.

After completion, claim the next eligible task **only if the engine remains `running`**. In `pausing` or `stopping`, settle the current task or safely checkpoint its unfinished phase, then pause or exit; do not dispatch its follow-ups. Cancelling/changing pending intent does not restart the active task. There is no harness hard-pause requirement. Force stop interrupts owned execution without false completion and retains available recovery evidence. See [service lifecycle](service-lifecycle.md).

An ordinary blocked task may be checkpointed and release task ownership when independent work is safe under [unattended operation](autonomous-operation.md), but independent tasks still cannot start while paused/draining. Never overlap mutations or mix unresolved changes into another result. A human wait is neither completion nor permission to discard work.

Start keeps supervising recoverable failures and empty queues, attempting safe recovery within budgets. Genuine blockers remain explicit rather than hidden input/unlimited calls. Finite run may exit with the same honest incomplete outcome. A lightweight dashboard cannot override this execution logic with its own state.

See [checks](checks.md), [Git persistence](git-persistence.md), [recovery](recovery.md), [traces](traces.md) and [task origins](task-origins.md).
