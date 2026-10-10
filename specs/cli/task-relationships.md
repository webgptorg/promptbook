# Task references and relationships

[Main specification](../_main.md)

Tasks can reference other tasks, form parent/subtask relationships and require predecessor work. These are explicit task metadata, not relationships inferred from file order, similar titles or agent teams.

`TASK PARENT` links a subtask to its parent. `TASK DEPENDS ON` identifies work that must complete before execution. Parent grouping alone does not imply an execution order; required ordering is explicit. Missing, ambiguous or cyclic dependencies block affected tasks with a clear reason, not the entire supervisor process.

Manager's assignment is a prerequisite of its target. Teacher's learning task follows and refers to the completed task that supplied its evidence. Both are ordinary task relationships, and both remain visible in the queue and Git record.

Use stable [references](../book-language/references.md), including for identically named tasks. Rename or movement must not silently redirect a reference to another task. A revert or source change requires reevaluating dependencies; a previous done label is not sufficient proof that a required result still exists.

See [origins](task-origins.md), [Manager](../agents/manager.md) and [Teacher](../agents/teacher.md).
