# Book language

[Main specification](../_main.md) · [Project model](../concepts/project-model.md)

Book is a human-readable language of natural text and commitments. It defines **agents, tasks and chats**, each in one `.book` source. The **first nonempty line is the entity's name**, and the rest contains prose and commitments. The entity kind is determined by its explicit `ENTITY` commitment or by the conventional source location; legacy `TASK <title>` headers remain readable only for compatibility.

- [Syntax](syntax.md): Document name, entity kind, text and commitment boundaries.
- [References](references.md): One normalized name resolver and graph links across all three kinds.
- [Inheritance](inheritance.md): Agent-only FROM, implicit Adam and termination.
- [Commitments](commitments/_index.md): One document per canonical commitment.

[Agents](../agents/_index.md), [Task Books](../cli/task-books.md) and [Chats](../cli/chats.md) define distinct semantics; common syntax does not make a chat executable or a task inheritable.
