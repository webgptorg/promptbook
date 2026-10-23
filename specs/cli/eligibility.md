# Task eligibility and ordering

[Main specification](../_main.md)

A task is eligible for its own execution only when its source is valid, it is unfinished and enabled, required predecessors are complete, its not-before condition is satisfied, routing is usable and no other project task owns execution. Placeholders and unsupported control syntax cannot become ready work.

Select higher priorities first, with stable source/reference order for ties. A future high-priority task must not block an eligible lower-priority task. Numeric and natural-language [TASK PRIORITY](../book-language/commitments/task-priority.md) values share an understandable ordering; unresolved interpretation is visible rather than guessed differently by each interface.

Distinguish readiness to perform a task from readiness to arrange missing routing. Newly saved future/recurring tasks are also candidates for ordinary [Router](../agents/core-agents/router.md) assignment work, before their own earliest start. Assignment priority follows the target, at most one numeric step higher, and temporal urgency; distant assignments wait behind urgent executable work. A missing assignment does not make the queue empty. Complete missing choices within the agent/task MODEL intersection; unavailable explicit routing remains blocked rather than silently replaced. An impossible combination creates a separate Fixer task. After the assignment commits, reevaluate the target automatically while retaining its execution date and dependencies.

List, dry-run, terminal, dashboard, API and actual execution must agree on readiness and distinguish awaiting automatic assignment from waiting for user action or an unavailable explicit requirement. Read-only views explain the next action but neither call a model nor create Router tasks. Reevaluate readiness on relevant source, capability or time changes.

See [task relationships](task-relationships.md), [not-before](not-before.md), [recurrence](recurrence.md) and [goal discovery](goal-discovery.md).

Dashboard smart sorting is a presentation of the complete inventory, not another execution order or a reason to discard old/future tasks. See [task views](task-views.md).
