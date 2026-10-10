# Referencing agents and tasks

[Book language](_index.md)

## Agents

An agent's identity comes from the first nonempty source line, not its filename or folder. Discover Books recursively under the project's `agents/`, including hidden directories. Normalize names consistently for case, diacritics and word separators, including camel case: `John Smith`, `johnSmith`, `john-smith` and `John_Smith` identify the same name.

Use `@john-smith` in natural text or `{John Smith}` for a multiword reference. A dedicated reference field such as FROM also accepts the bare name. Supported explicit local Book paths resolve from the declaring Book, but do not override name uniqueness or workspace protection. In references, `@Expert` is an agent reference, not an unrelated text parameter.

All normalized project names must be unique. A collision gives source locations and prevents ambiguous startup/execution. Reserved [non-agent identities](../agents/non-agents.md) cannot be shadowed. Missing core definitions are materialized individually; an unresolved ordinary reference is not permission to invent an agent or silently change inheritance.

Moving a named agent into another folder does not change references. Hidden location affects ordinary automatic task selection, not whether FROM, IMPORT, TEAM or an explicit task can resolve it.

## Tasks

Task titles may repeat and are never required to become unique slugs. Use a stable task reference such as `#<task-id>` from `TASK ID`, or an explicit local task source reference where unambiguous. Engine/authoring operations assign stable IDs when needed, preserving titles; list and dry-run do not write them.

Relationships must resolve to one task, even when two titles and commit messages are identical. Do not silently pick a matching title, change references on rename or reuse another task's identity. Show ambiguous/missing references and block only work that depends on them.

See [task relationships](../cli/task-relationships.md), [TASK ID](commitments/task-id.md) and [agent consistency](../agents/consistency.md).
