# TASK ID

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Provides the task's stable, unique reference key, distinct from its display title, source location and commit subject. Authoring generates an ID for every new task; existing/manual tasks lacking one receive it in a scoped preparation operation before execution. Read-only inspection never creates IDs. Preserve valid IDs through edits, moves, retries, completion, archiving and format conversion; duplicate or path-unsafe explicit IDs are errors for affected definitions.

The same ID appears in task-related commit metadata and the root-level `traces/<task-id>/` directory. Recurring occurrences and attempts remain distinguishable beneath that task identity. See [task identity](../../cli/task-identity.md), [references](../references.md) and [traces](../../cli/traces.md).
