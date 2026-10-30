# Project model: agents, tasks and chats

[Main specification](../_main.md) · [Book language](../book-language/_index.md) · [Resolution](../book-language/references.md)

## The three project entities

A Promptbook project is a Git-backed collection of agents, tasks and chats. Each entity has one readable `.book` whose opening `AGENT <name>`, `TASK <name>` or `CHAT <name>` declares its kind and human-readable name. Subsequent commitments develop that entity. All kinds share syntax/parser, with different engine semantics. Filename/directory are storage and lookup hints, not identity or a substitute for kind. There is no separate generated entity ID; normalized name content is its logical reference.

- **Agent — who:** a persistent teachable role/instructions that may execute tasks and participate in chats.
- **Task — what:** bounded work with an owner, conditions, result/checks and evidence, possibly recurring, executed through the ordinary lifecycle.
- **Chat — conversation and record:** persistent participants/exchanges for questions, decisions, status, consultation and requesting work. It is not executable and may exist without a task.

The opening commitment establishes the entity; later commitments build its role, assignment or conversation, not further entities inside it. This differs from the graph of references. Language extensions do not require separate grammars for every kind.

References between any entities form a directed graph, not a hierarchy: chats/tasks can refer to many of one another, agents to agents, and each kind to either other kind. Shared deterministic resolution applies. A link alone neither schedules work nor grants authority/reciprocity. UIs can display outgoing/incoming edges.

Every resolved name selects exactly one Book. Conflicting/copied definitions are not merged; collisions are visible maintenance issues without automatically invalidating ordinary resolution. [Generated task/chat names](../cli/generated-names.md) proactively include creation date/time and normalized checks, without new identity fields or language validity restrictions. Task [trace directories](../cli/traces.md) separately copy the literal source filename without its extension; that storage convenience is not logical identity.

These are the three **project Book entities**. The engine can also define [system tasks](../cli/system-tasks.md), such as self-update, without a project Book. They share task scheduling/observation rather than adding a fourth Book entity; tasks performed by core agents remain ordinary tasks.

## Work and conversation

Agents converse without necessarily creating tasks; a later message can create several. Tasks can involve many linked chats and bounded TEAM consultations. Human-facing chats support User and one or more agents; internal two-agent consultations retain task/conversation scope. Task agents can join an originating chat before asking questions or reporting results. Chat primarily coordinates and creates tasks for substantial execution under [chat/task relationships](../cli/chat-tasks.md).

[Chatter](../agents/core-agents/chatter.md) is the default human-facing project entry when no specialist was explicitly selected. It clarifies intent, handles basic authorized actions and uses teammates for specialist advice/work. It is an ordinary required project agent, not the scheduler or a privileged replacement for specialist tasks.

Every independently saved versioned operation follows [Git persistence](../cli/git-persistence.md). Human-facing messages save immediately and compatible changes use bounded debounced commits, preserving chronology and attribution. Agent messages inside one executing task join its result commit; conversation-scoped specialist advice without a task uses ordinary scoped authoring persistence. See [chats](../cli/chats.md).

## Engine and clients

Every active engine owns one concrete project directory, its scheduling and lifecycle state. [Exclusive locking](../cli/locking.md) prevents two engines from owning that project, even from different installations. There is no global project engine.

A dashboard is a lightweight observer/controller of that engine, not the owner of its work. There may be zero or many simultaneous terminal/browser/API clients. Opening/closing them never starts/stops the engine; their explicit commands call the same engine operations, and state changes are visible everywhere. Client presentation choices are not engine state.

The separate [global dashboard](../cli/global-dashboard.md) discovers all accessible running project engines across the local host, independently of CWD or package installation. It is a continuously refreshed table that remains open at zero entries and can attach to a selected project's view without starting it. A per-project dashboard still reports missing service actionably instead of starting one.

## Illustrative analogy (not product vocabulary)

A company follows a general framework, requires some common roles and can employ specialists. Engine system agents resemble that framework, editable core agents the required roles, and other project agents specialists. This illustrates ownership/evolution, not legal entities, permissions or employment categories; [agent definitions](../agents/_index.md) are normative.

Likewise, Expert resembles a built-in runtime function while a core Book resembles a small extensible starter program. This does not prescribe an implementation language. See [engine/project evolution](engine-and-project.md).
