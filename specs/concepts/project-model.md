# Project model: agents, tasks and chats

[Main specification](../_main.md) · [Book language](../book-language/_index.md) · [Resolution](../book-language/references.md)

## The three project entities

A Promptbook project is a Git-backed collection of **agents**, **tasks** and **chats**. Each entity is represented by one readable `.book` document. Its first nonempty line declares its human-readable **name**; subsequent text and commitments define its behavior, work or conversation. The filename and directory are storage and lookup hints, **not identity**. There is no separate generated entity ID: a normalized name is the project's logical reference.

- **Agent:** a persistent, teachable role and its instructions. It may execute tasks and participate in chats.
- **Task:** bounded work with an owner, conditions, result, checks and execution evidence. Work is completed through the ordinary task lifecycle.
- **Chat:** a persistent conversation, not an executable task. It supports questions, decisions, status enquiries, consultation and initiating or requesting work. A chat can exist without any task.

Explicit references between any two entities, including entities of the same kind, form a **directed graph**. The graph is not a hierarchy: a chat may refer to several tasks, a task may refer to several chats, agents may refer to one another, and each entity can refer to either of the other kinds. References are resolved through one shared, deterministic policy; the existence of a link does not by itself schedule work, confer authority or require reciprocity. UIs may display both outgoing and incoming edges.

This is a *design invariant*, not permission to concatenate all Books into one definition. Every resolved name selects exactly one Book. A copied or conflicting definition is not merged into an interface or another Book. Collisions are visible maintenance issues but do not by themselves invalidate ordinary resolution.

## Work and conversation

A task and a chat solve different problems. An agent can converse with the user without creating work; a message may later create one or more tasks. Conversely, a task may involve several related conversations or bounded TEAM consultations. The relationship is optional and many-to-many. Direct user↔agent and task-scoped agent↔agent chats are supported now; additional participant topologies are a future extension, not required current behavior.

Every independently saved versioned change, including an ordinary chat message, follows [default Git persistence](../cli/git-persistence.md). Agent↔agent messages produced *inside one executing task* belong to that task's single result commit rather than a sequence of side commits. See [Chats](../cli/chats.md).

## Illustrative analogy (not product vocabulary)

A company follows a general legal framework, needs some commonly recurring roles, and can also employ specialists such as an ice-cream taster. In this analogy only, engine **non-agents** resemble the framework, editable **core agents** resemble commonly required roles, and other **project agents** resemble specialists. These are *not* Promptbook legal entities, permissions or employment categories; the normative definitions are in [agent categories](../agents/_index.md).

Similarly, an engine-provided Expert resembles a built-in runtime function, while a materialized core agent resembles a small extensible starter program. This illustrates **ownership and evolution**, not a required implementation language. See [engine and project evolution](engine-and-project.md).
