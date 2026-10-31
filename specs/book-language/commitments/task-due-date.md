# TASK DUE DATE

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Expresses the desired completion deadline and is shown in task planning/status. It is not the earliest-start condition: use TASK AFTER to defer execution. Missing or expired deadlines must not fabricate completion or bypass dependencies.

For an authorized change, append the new valid value with TASK CHANGE scope/provenance, retaining the previous source layer. The last valid applicable value in source order is effective; invalid or unresolved conflicting input is diagnosed and cannot silently change active work. Reconcile an active task/session under [task control](../../cli/task-control.md) before treating the change as applied. This scalar rule does not replace additive TASK DEPENDS ON or TASK RUNNER semantics.
