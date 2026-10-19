# Agents

[Main specification](../_main.md) · [Project model](../concepts/project-model.md)

An agent is a persistent role, goal, instructions and learned project knowledge, not a permanently running model call. Its Book starts with [AGENT](../book-language/commitments/agent.md), for example `AGENT Developer`; `Developer` supplies the name, while later commitments develop the role. Agents, tasks and chats are distinct Book entities sharing syntax and [normalized name references](../book-language/references.md). Only one project task executes at a time; ordinary chats and read-only consultations do not by themselves execute queued work.

- [Core agents](core-agents.md): Minimal editable required roles Adam, Manager, Teacher, Fixer and Chatter.
- [Chatter](chatter.md): Default human-facing project entry, with specialist TEAM consultation and ordinary task creation.
- [Non-agents](non-agents.md) and [Expert](expert.md): Engine-defined references/behavior, not project-owned Books.
- [Fixer](fixer.md): Ongoing introspection/repair through ordinary tasks, chats and learning.
- [Manager](manager.md): Automatic task assignment.
- [Teacher](teacher.md) and [learning](learning.md): Ordinary open/closed learning.
- [References](../book-language/references.md): One ordered resolver across all entity kinds.
- [Visual identity](visual-identity.md) and [consistency](consistency.md): Stable presentation and guarded execution.

Project agents normally live under `agents/`; required core Books are initialized under `agents/.core/`. Location never replaces AGENT. A core is technically an ordinary project agent required by the engine, not a privilege or special learning mechanism. Non-agents Void/Null, User and Expert come from the running engine. Chatter's promoted default [chat picker](../cli/chat-ui.md) is a UI entry policy, not a new agent category or automatic scheduler. See [engine/project evolution](../concepts/engine-and-project.md).
