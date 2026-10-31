# TASK REOPEN

[Commitments](_index.md) · [TASK DONE](task-done.md) · [TASK STATUS](task-status.md) · [Task control](../../cli/task-control.md)

**Document:** Task.

`TASK REOPEN <timestamp> [<chat-reference>]` appends deliberate reopening of the same work, with an explicit timezone and optional source-chat reference. Preserve the task's opening name, original instructions, earlier DONE stamps and result commits. Record the reason/new instructions through TASK CHANGE. Reopening does not itself claim/start work or grant new authority.

For a nonrecurring task, DONE closes the current work cycle successfully and a status transition to cancelled closes unfinished work without success. REOPEN begins another cycle of that same task. Process these events in **source order**; wall-clock sorting cannot rewrite chronology. A later `todo` affects scheduling but cannot erase a closed cycle without REOPEN. A later successful completion appends another DONE and scoped result commit. Repeated transport delivery is deduplicated; an already-open no-op does not manufacture another event. Historical `TASK DONE unknown` remains historical and can be followed by a real reopening.

TASK STATUS is an independent scheduling/outcome control: a retained `not-ready`, `failed`, `cancelled` or `retired` is not silently removed by REOPEN. Deliberate reactivation appends `TASK STATUS todo` together with REOPEN where needed. `todo` alone does not reopen a completed/cancelled one-off task. Reopened work waits behind the owner's other unfinished started task. Revalidate dependent-task eligibility; do not undo already executed dependants automatically.

Recurring definitions retain occurrence completion semantics. Normal next occurrences require no REOPEN. Reopening one previously completed occurrence requires explicit occurrence provenance and must not duplicate the active schedule or overlap another occurrence. TASK REOPEN never creates a second task identity.
