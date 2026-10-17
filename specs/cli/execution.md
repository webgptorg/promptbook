# Task execution lifecycle

[Main specification](../_main.md)

One project executes one task at a time, including assignment, teaching, bootstrap and goal-enquiry tasks. TEAM consultations remain part of that executing task. All entry points use the same lifecycle and acceptance rules.

Select eligible work, establish its current source, normalized [task name](task-identity.md) and execution context, perform the work, verify the requested outcome and project checks, prepare completion and follow-up tasks, and commit the accepted result. Record actual agent/harness/model/thinking selection, actions, checks and outcomes in that task's root-level [trace directory](traces.md) from its first attempt, including available harness output, linked task-scoped chats and enabled browser recording.

A task may change project materials, agent definitions and other tasks. The original task's completion, accepted changes, newly created follow-ups and policy-eligible traces belong to one result commit, correlated by its `Task-Name`. Follow-ups receive distinguishable readable names. Learning happens later as Teacher's own task. Initial project content creation and subsequent maintenance use this same mechanism; initialization itself does not run a special bootstrap implementation.

Failed checks produce bounded repairs and rechecks of the same work, not an unverified completion. Commit or synchronization failure must not blindly rerun successful work or external effects. A task waiting for the user or recovery remains visibly unfinished, with its identity and prior attempts preserved.

After completion, continue with the next eligible task. A blocked task may instead be checkpointed and release ownership when it is safe to run independent work, under [unattended operation](autonomous-operation.md). Never overlap task mutations or mix an unresolved task's changes into another result. A human wait is not completion or permission to discard owned work.

Start continues supervising after recoverable failure or an empty queue. Attempt safe automatic recovery within budgets; when progress is impossible, preserve work and expose the specific blocking condition rather than hang on hidden input or consume unlimited calls. Finite run may exit with the same explicit incomplete result.

See [checks](checks.md), [Git persistence](git-persistence.md), [recovery](recovery.md), [traces](traces.md) and [task origins](task-origins.md).
