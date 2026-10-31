# TASK DONE

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Records successful completion as `TASK DONE <timestamp>` with an explicit timezone. The stamp and accepted result belong to the same commit. Recurring work appends an occurrence completion rather than retiring the definition. Conversion of an undated completed Markdown task may use the explicit value `unknown`, with provenance; new execution must always record the real completion time.

A prior DONE is historical after a later valid [TASK REOPEN](task-reopen.md). For one-off work, source ordering of DONE/REOPEN determines current completion; `TASK STATUS todo` alone cannot negate a DONE. A later accepted completion appends a new real DONE/result commit. Reject stale completion while a newer applicable TASK CHANGE has not been reconciled with affected execution and validation. Recurring DONE remains occurrence-scoped; cancellation/retirement cannot turn it into proof that cancelled work succeeded.
