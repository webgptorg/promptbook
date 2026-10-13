# Task eligibility and ordering

[Main specification](../_main.md)

A task is eligible for its own execution only when its source is valid, it is unfinished and enabled, required predecessors are complete, its not-before condition is satisfied, routing is usable and no other project task owns execution. Placeholders and unsupported control syntax cannot become ready work.

Select higher priorities first, with stable source/reference order for ties. A future high-priority task must not block an eligible lower-priority task. Numeric and natural-language [TASK PRIORITY](../book-language/commitments/task-priority.md) values share an understandable ordering; unresolved interpretation is visible rather than guessed differently by each interface.

For `start`, distinguish readiness to perform a task from readiness to arrange its missing routing. An otherwise actionable task with no assigned agent/harness is a candidate for automatic [Manager](../agents/manager.md) prerequisite work, even though the target itself is not yet executable. Do not filter it out before assignment or treat the queue as empty. Complete missing routing automatically; unavailable explicit routing remains blocked rather than silently replaced. After the prerequisite commits, reevaluate and continue the target without user intervention. For `run`, apply the invocation's fixed configuration and filters. Dependencies take precedence over priority.

List, dry-run, terminal, dashboard, API and actual execution must agree on readiness and distinguish awaiting automatic assignment from waiting for user action or an unavailable explicit requirement. Read-only views explain the next action but neither call a model nor create Manager tasks. Reevaluate readiness on relevant source, capability or time changes.

See [task relationships](task-relationships.md), [not-before](not-before.md), [recurrence](recurrence.md) and [goal discovery](goal-discovery.md).
