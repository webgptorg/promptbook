# Earliest execution time

[Main specification](../_main.md)

`TASK AFTER` gives an inclusive earliest-start boundary: execute only when the current time reaches it. A due date is a deadline, not an alternative permission to start. In Markdown, scheduling is recognized only in an entire backtick token on the task's own control line, not dates in descriptions, URLs or model names.

Accept `YYYY-MM-DD`, or a date plus time separated by a space or `T`, with optional seconds/fraction and `Z` or a numeric offset. A date alone means the beginning of that day. Without an offset, resolve and display the project/invocation's local timezone, retaining it when activating a schedule. Ambiguous or nonexistent local times require clarification or an explicit offset.

Invalid, conflicting or unrecognized dates block the task; they never remove the restriction. A model identifier containing a date remains a model identifier. Pause/resume and skip-wait controls cannot bypass a task's earliest start.

A finite run reports future work and exits when no eligible work remains. Start waits efficiently, reevaluating source changes and time. Resuming an already-started task follows recovery rules rather than claiming a new scheduled occurrence.

See [TASK AFTER](../book-language/commitments/task-after.md), [TASK DUE DATE](../book-language/commitments/task-due-date.md) and [recurrence](recurrence.md).
