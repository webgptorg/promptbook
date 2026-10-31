# TASK STATUS

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Optionally holds work with `not-ready`, marks a failed result with `failed`, or retires recurring work with `retired`. `todo` or omission leaves an unfinished task schedulable when its other conditions permit. Completion is represented by TASK DONE, not by a competing done status. Active/waiting/recovery activity is visible runtime state. See [eligibility](../../cli/eligibility.md).

Supported values are `todo`, `not-ready`, `failed`, `cancelled` and `retired`. `cancelled` records intentional termination of unfinished work without success and releases the agent's reservation only after active work/effects are reconciled. `retired` prevents new recurring occurrences and preserves Book, schedule and all prior outcomes; the scope of stopping a current occurrence follows TASK CHANGE/user intent. Neither means delete or rollback. Failed/cancelled work does not satisfy a successful dependency.

Append actual transitions chronologically; the last valid nonliteral status is effective, omission means `todo`. A source status is requested intent, not proof that an in-flight session has already stopped. Reactivating a successfully completed or cancelled one-off task needs [TASK REOPEN](task-reopen.md) and `todo` where an independent status still blocks it. Status and DONE/REOPEN are distinct projections: a stale status cannot erase historical success; a stale DONE cannot complete a later reopened work revision. Active/waiting/receipt state remains engine observation, not another source status.
