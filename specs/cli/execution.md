# Task execution lifecycle

[Main specification](../_main.md)

One project executes one task at a time, including assignment, teaching and goal-enquiry tasks. TEAM consultations remain part of that active task. All entry points use the same lifecycle and acceptance rules.

Select eligible work, establish its current source and execution context, perform the work, verify the requested outcome and project checks, prepare completion and follow-up tasks, and commit the accepted result. Only then select the next task. Record the actual agent, harness, model, thinking setting, actions, checks and outcome.

A task may change project materials, agent definitions and other tasks. The original task's completion, its accepted changes and newly created follow-ups belong to one commit. Learning itself happens later as Teacher's own task. Initial project creation and subsequent maintenance use this same mechanism.

Failed checks produce bounded repairs and rechecks of the same active work, not an unverified completion. Commit or synchronization failure must not blindly rerun successful work. A task waiting for the user or recovery is visibly unfinished.

Start continues supervising after recoverable failure or an empty queue. When safe progress is impossible it preserves the work and exposes the blocking decision, without terminating the supervisor or consuming unlimited model calls. Finite run may exit with the same explicit result.

See [checks](checks.md), [Git persistence](git-persistence.md), [recovery](recovery.md), [traces](traces.md) and [task origins](task-origins.md).
