# Task and conversation relationships

[Project model](../concepts/project-model.md) · [References](../book-language/references.md)

`TASK PARENT` links one task to another. `TASK DEPENDS ON` names prerequisite tasks. Parent grouping alone does not impose order; missing, wrong-kind or cyclic required dependencies block affected work. Manager assignment, Teacher learning and Fixer repair are ordinary task relationships, not exceptional task types. All targets use the shared normalized Book-name resolver, **not task IDs**.

Generic `LINK` and Book references connect any Agent, Task or Chat, yielding a **directed** graph. One task can relate to many chats and one chat to many tasks, with no mandatory relationship at all. Views may show incoming and outgoing edges without writing inverse source links. LINK alone never schedules a task, grants authority, creates a participant or enforces a dependency.

Names can collide: the deterministic first winner applies, with maintenance diagnostics for shadowed files; do not silently switch to an alternate task. Renames, deletion or reverted results require intentional reference and history reconciliation. See [Chats](chats.md), [task origins](task-origins.md) and [task identity](task-identity.md).
