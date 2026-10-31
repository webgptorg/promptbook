# TASK REPEAT

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Defines a positive fixed interval for recurring work. An occurrence has its own completion and result commit; previous TASK DONE stamps do not end an active schedule. See [recurrence](../../cli/recurrence.md) for anchoring, downtime, changes and retirement.

Schedule modifications append new valid typed values with TASK CHANGE scope/provenance, retaining earlier values and outcomes. Retirement disables future occurrence claims without deleting the definition; current-run effects follow the explicit instruction. See [recurrence changes](../../cli/recurrence.md#append-only-schedule-direction).
