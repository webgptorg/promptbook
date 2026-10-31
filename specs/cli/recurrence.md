# Recurring work

[Main specification](../_main.md)

`TASK REPEAT` defines a positive fixed interval in seconds, minutes, hours, days or weeks, for example `30m`, `7d`, `every 2 weeks` or `P1W`. A day is 24 hours and a week is seven days. Calendar months/years are not fixed intervals. Reject invalid, zero or overflowing values.

`TASK AFTER`, when supplied, anchors the first occurrence. Otherwise the first occurrence is eligible at activation and its anchor is retained. Completion does not shift the schedule. Retain occurrence sequence, completion stamps, failures and next due time across restart. Changing the task's first-line name changes its logical identity and requires explicit migration of schedule and historical evidence.

Each successful occurrence appends its own `TASK DONE` timestamp and has one task-result commit. The presence of previous stamps does not retire an active recurring definition. Explicit pause/retirement prevents further occurrences; resuming does not erase history.

Coalesce missed slots into at most one catch-up occurrence instead of generating months of work after downtime. Never overlap occurrences. The ongoing engine continues with later due slots, retaining its recorded agent/MODEL choice across occurrences; no automatic rerouting or Updater is introduced now.

A real interval/anchor change creates a new schedule revision; equivalent spelling changes do not. Apply schedule changes to future slots without silently rewriting the current occurrence; an explicit current-run amendment/cancellation follows [task control](task-control.md) and must reach its live session. Failed or ambiguous work must be reconciled before further occurrences, not bypassed by the next due time. These guarantees concern one coordinated project, not independent clones.

See [TASK REPEAT](../book-language/commitments/task-repeat.md), [TASK STATUS](../book-language/commitments/task-status.md) and [recovery](recovery.md).

## Append-only schedule direction

Append changed schedule/status commitments and TASK CHANGE provenance instead of replacing previous layers. For repeated TASK REPEAT/TASK AFTER controls, the last valid applicable value determines the schedule revision; preserve earlier values, anchors and occurrence outcomes. Equivalent spellings do not create new work. TASK STATUS retired prevents further occurrence claims and keeps the Book/history. `todo` deliberately reactivates an eligible retained definition; past DONE events do not create duplicates.

Distinguish current-occurrence, future-only and task-wide instructions. “Stop future reports; finish today's” permits today's result, while “send no more reports” also requires reconciling any in-flight pending send. Neither statement retracts an already sent report. A one-off completion correction/reopen and the next scheduled occurrence cannot overlap; reconcile occurrence provenance, agent reservation and applicable revisions first.
