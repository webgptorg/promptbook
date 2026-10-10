# Task eligibility and ordering

[Main specification](../_main.md)

A task is eligible only when its source is valid, it is unfinished and enabled, required predecessors are complete, its not-before condition is satisfied, routing is usable and no other project task owns execution. Placeholders and unsupported control syntax cannot become ready work.

Select higher priorities first, with stable source/reference order for ties. A future high-priority task must not block an eligible lower-priority task. Numeric and natural-language [TASK PRIORITY](../book-language/commitments/task-priority.md) values share an understandable ordering; unresolved interpretation is visible rather than guessed differently by each interface.

For `start`, missing routing creates the required Manager task; unavailable explicit routing stays blocked. For `run`, apply the invocation's fixed configuration and filters. Dependencies take precedence over priority.

List, dry-run, terminal, dashboard, API and actual execution must agree on readiness and explain waiting, blocked, invalid and filtered tasks. Read-only views neither call a model nor mutate task sources. Reevaluate readiness on relevant source, capability or time changes.

See [task relationships](task-relationships.md), [not-before](not-before.md), [recurrence](recurrence.md) and [goal discovery](goal-discovery.md).
