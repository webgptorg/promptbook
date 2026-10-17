# Agents

[Main specification](../_main.md) · [Project model](../concepts/project-model.md)

An agent is a persistent role, goal, instructions and learned project knowledge, **not** a permanently running model call. Agents, tasks and chats are distinct Book entities sharing [normalized name references](../book-language/references.md). Only one project task executes at a time; ordinary chats do not by themselves execute queued work.

- [Core agents](core-agents.md): Minimal editable required roles Adam, Manager, Teacher and Fixer.
- [Non-agents](non-agents.md) and [Expert](expert.md): Special engine-defined roles and behavior, not project-owned Books.
- [Fixer](fixer.md): Ongoing project introspection and repair through ordinary tasks, chats and learning.
- [Manager](manager.md): Automatic task assignment.
- [Teacher](teacher.md) and [learning](learning.md): The ordinary open/closed learning mechanism.
- [References](../book-language/references.md): One ordered resolver across all three entity kinds.
- [Visual identity](visual-identity.md) and [consistency](consistency.md): Stable presentation and guarded execution.

Project agents normally live under `agents/`; required core Books are initialized in `agents/.core/`. A **core agent is technically an ordinary project agent** that the engine expects to exist, not a special inference mechanism, privilege or kind of learning. The difference from non-core specialists is the engine's expectation and starter materialization. Non-agents (`Void`/`Null`, `User`, `Expert`) come from the running engine instead. See [engine/project evolution](../concepts/engine-and-project.md).
