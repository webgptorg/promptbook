# Recurring work

[Main specification](../_main.md)

`TASK REPEAT` defines a positive fixed interval in seconds, minutes, hours, days or weeks, for example `30m`, `7d`, `every 2 weeks` or `P1W`. A day is 24 hours and a week is seven days. Calendar months/years are not fixed intervals. Reject invalid, zero or overflowing values.

`TASK AFTER`, when supplied, anchors the first occurrence. Otherwise the first occurrence is eligible at activation and its anchor is retained. Completion does not shift the schedule. Retain occurrence identity, completion stamps, failures and next due time across restart and renaming.

Each successful occurrence appends its own `TASK DONE` timestamp and has one task-result commit. The presence of previous stamps does not retire an active recurring definition. Explicit pause/retirement prevents further occurrences; resuming does not erase history.

Coalesce missed slots into at most one catch-up occurrence instead of generating months of work after downtime. Never overlap occurrences. A finite run executes at most one occurrence of each definition; start continues with later due slots.

A real interval/anchor change creates a new schedule revision; equivalent spelling changes do not. Finish a running occurrence under its existing definition before applying a revised schedule. Failed or ambiguous work must be reconciled before further occurrences, not bypassed by the next due time. These guarantees concern one coordinated project, not independent clones.

See [TASK REPEAT](../book-language/commitments/task-repeat.md), [TASK STATUS](../book-language/commitments/task-status.md) and [recovery](recovery.md).
