# Agents

[Main specification](../_main.md) · [Project model](../concepts/project-model.md) · [Automatic repair](../concepts/automatic-repair.md)

An agent is a persistent role, goal, instructions and learned project knowledge, not a permanently running model call. Its Book starts with [AGENT](../book-language/commitments/agent.md), for example `AGENT Developer`; Developer supplies the name and later commitments develop the role. Agents, tasks and chats are distinct Book entities sharing syntax and [normalized name references](../book-language/references.md). Tasks and chats share the configurable active-work limit (five by default) and [per-file ownership](../cli/concurrency.md) in one working tree. Chats and their necessary routing/read-only consultations remain eligible during scheduling pause without dispatching queued work.

- [Core agents](core-agents.md): Minimal editable required roles Adam, Router, Tasker, Teacher, Fixer and Chatter; one specification per role in `core-agents/`.
- [Chatter](core-agents/chatter.md): Project spokesperson and brief author, with human conversation, specialist TEAM consultation and ordinary tasks.
- [System agents](system-agents.md) and [Expert](expert.md): Engine-defined references/behavior, not project Books.
- [Fixer](core-agents/fixer.md): Ordinary OPEN general problem solver, expected for system-routed problems and customizable like other agents.
- [Automatic repair principle](../concepts/automatic-repair.md): First-class cross-system recovery and minimal unnecessary user decisions, not a special Fixer implementation/channel.
- [Router](core-agents/router.md): Automatic task assignment.
- [Tasker](core-agents/tasker.md): Task creation and management, distinct from routing.
- [Teacher](core-agents/teacher.md) and [learning](learning.md): Ordinary OPEN/CLOSED learning.
- [References](../book-language/references.md): One ordered resolver across all entity kinds.
- [Visual identity](visual-identity.md) and [consistency](consistency.md): Stable presentation and guarded execution.

Project agents normally live under agents/ and required core Books under agents/.core/. Location never substitutes for AGENT. Required presence does not grant privilege or different learning/communication. Fixer's initial simple Book includes User and Expert in TEAM, but users can customize consultation policy or remove User; reinit preserves such changes. Tool/account configuration and available capabilities constrain every agent, including Fixer, rather than giving cores a hidden execution route.

Void/Null, User and Expert come from the running engine. Chatter's promoted default [chat picker](../cli/chat-ui.md) is an entry policy, not another agent kind or automatic scheduler. See [engine/project evolution](../concepts/engine-and-project.md).
