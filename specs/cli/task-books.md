# Task Books

[Project model](../concepts/project-model.md) · [Syntax](../book-language/syntax.md)

A task is bounded work stored in one `.book` document. Its **first nonempty line is its name**; `ENTITY TASK` declares the kind, or conventional `tasks/` placement supplies the default. Legacy `TASK <title>` first lines remain readable but are not canonical new authoring. The task name is its identity; there is no separate generated task ID.

```book
Improve CSV export
ENTITY TASK

Preserve column names and correctly quote cells with commas or newlines.
Add regression tests.
TASK AGENT @Developer
TASK PRIORITY 2
TASK AFTER 2026-10-30T09:00:00+01:00
LINK {Discuss CSV requirements}
RULE Do not change the public interface.
```

Titles can collide. The common resolver picks one normalized-name winner, never merges definitions; shadowed files prompt diagnostics. New authoring should choose distinguishable readable names, and renaming the first line needs explicit link/history reconciliation. The filename is not identity. Task commitments define owner, dependencies, state and scheduling; LINK supplies optional directed references including many-to-many task↔chat edges, **not** execution dependencies.

`ptbk add` saves and commits a new unfinished task before dispatch. Creation is not completion. An accepted task or occurrence appends `TASK DONE <timestamp>` in its **one result commit**, together with checked changes, follow-ups and eligible traces. Result subject: `PTBK: <task name>`; body preserves the assignment and a `Task-Name: <name>` trailer instead of a Task-ID. Follow-ups receive their own distinct-in-practice names and normal scheduling. The initial Expert bootstrap is an ordinary task under these rules.

See [task identity](task-identity.md), [relationships](task-relationships.md), [recurrence](recurrence.md), [authoring](authoring.md) and [Git persistence](git-persistence.md).
