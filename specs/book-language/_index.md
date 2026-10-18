# Book language

[Main specification](../_main.md) · [Project model](../concepts/project-model.md)

Book is one human-readable language for **agents, tasks and chats**, each in one `.book` source. Its three syntactic building blocks are **commitment keywords**, their **content**, and **references** within nonliteral content. Every canonical Book starts with a type-and-name commitment: `AGENT <name>`, `TASK <name>` or `CHAT <name>`. The name is the commitment's content, not a separate unprefixed header or a filename.

The same syntax and parser apply to every entity kind. The first commitment establishes what is being defined; subsequent commitments build up that entity's instructions, work or conversation. Entity-specific validation and engine behavior are separate from parsing. The commitment vocabulary and supported entity kinds may grow without introducing another document grammar.

- [Syntax](syntax.md): Commitment-first documents, uppercase boundaries, content and diagnostics.
- [References](references.md): One normalized name resolver and graph links across all three kinds.
- [Inheritance](inheritance.md): Agent-only FROM, implicit Adam and termination.
- [Commitments](commitments/_index.md): One document per canonical commitment.
- [Generated names](../cli/generated-names.md): Preventive task/chat naming, separate from language validity and filenames.

[Agents](../agents/_index.md), [Task Books](../cli/task-books.md) and [Chats](../cli/chats.md) define distinct semantics; common syntax does not make a chat executable or a task inheritable. Plain name headers and `ENTITY` belong to [explicit legacy conversion](../cli/migration.md), not canonical authoring or folder-based type inference.
