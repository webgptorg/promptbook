# TASK AFTER

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Sets the inclusive earliest permitted start as a date/time. It does not mark completion or require constant model polling. Invalid/conflicting values block execution. See [earliest execution time](../../cli/not-before.md).

For an authorized change, append the new valid value with TASK CHANGE scope/provenance, retaining the previous source layer. The last valid applicable value in source order is effective; invalid or unresolved conflicting input is diagnosed and cannot silently change active work. Reconcile an active task/session under [task control](../../cli/task-control.md) before treating the change as applied. This scalar rule does not replace additive TASK DEPENDS ON or TASK RUNNER semantics.
