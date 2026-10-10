# Task eligibility

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Selecting a task requires a valid source, an allowed lifecycle, a complete description without placeholders, a matching priority, compatible routing, a satisfied trigger and an available claim. Evaluation must return an explanation: `ready`, `waiting-until`, `blocked`, `invalid`, `unsupported` or exclusion by a filter; it may also provide the next wake-up.

The same evaluator serves list, dry-run, the dashboard, the server and the actual claim. It receives injected clock, timezone, configuration and stored state. It performs no I/O, Git operations, waiting or model calls. A parsed-document cache is not a cache of time-dependent eligibility.

## Related specifications

- [Legacy Markdown tasks](task-markdown.md)
- [Task Books](task-books.md)
- [Not-before: earliest start](not-before.md)
- [Recurring task Books](recurrence.md)
- [Mutation lease, journal and recovery](recovery.md)
