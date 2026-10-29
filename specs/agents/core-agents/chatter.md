# Chatter: the default human-facing project agent

[Agents](../_index.md) · [Core agents](../core-agents.md) · [Chat entry](../../cli/chat-ui.md) · [TEAM](../../cli/team.md)

**Chatter** is the user's ordinary conversational entry point when they want to inspect, discuss or manually direct a project without knowing which specialist to choose. It is a project-owned core agent, not the engine, the automatic scheduler or a replacement for Tasker, Router and specialist execution. Chatter remains the main agent while teammates advise or execute specialist tasks; those agents can join the same human-facing thread under their own names.

## Initialization and ownership

Materialize a missing `agents/.core/chatter.book` with `AGENT Chatter` during ordinary initialization/readiness setup. Use a small editable boilerplate, normal Adam inheritance and ordinary default OPEN learning. It has the same Book, routing, harness, TEAM, Git and authority rules as other project agents, with no privileged hidden execution mechanism.

At creation, include TEAM access to all other agents materialized/selected for that initialization, including the other core roles and specialists; Chatter must not consult itself. It can also consult the built-in Expert for engine-specific questions. Keep these relationships readable and editable. Users may add other teammates or change policy later. Reinitialization or engine upgrade adds a missing Chatter without resetting any existing customized core/specialist Book or rewriting an existing Chatter's team.

Core hiding still applies to ordinary automatic discovery, but new human-chat entry explicitly promotes Chatter as its first/default choice. This does not make Chatter a non-agent or grant it broader access.

## Conversation and delegation

Chatter answers project questions, clarifies intent, explains status and creates/manages ordinary named tasks. Chat primarily coordinates: substantial work such as implementing a feature or submitting a tax return becomes a task, with a prompt creation response instead of inline execution/waiting for completion. For specialist topics it consults appropriate teammates rather than pretending to have performed their work itself. TEAM advice is attributed and bounded. Work requiring task execution goes through the normal queue, ownership, checks and persistence; opening a chat or asking a read-only question does not create a task or start an engine.

A specialist consultation in an existing task retains that task's trace and result-commit scope. A consultation serving a conversation without an executing task is a linked two-agent exchange under [chat/TEAM rules](../../cli/team.md), not a fabricated task. Advice can remain internal; a task agent contributing to the human thread joins explicitly and speaks under its own name. Chatter remains the main agent. It distinguishes requested, queued, running and completed work and cannot report a proposal as implemented.

Normal approval, scope, account, browser, learning and secret-handling rules still apply. Chat and its necessary routing/consultations work while another task executes and while background scheduling is paused. Tasks created in that conversation stay pending during pause. Chatter does not dispatch queued work through chat, bypass stopping, commit unrelated edits or take over another task's ownership. Task-authoring conversations can use Tasker through ordinary consultation or an explicitly selected Tasker chat. Its user messages follow the same immediate-save/debounced-commit persistence contract as every other human-facing chat.

## Entry-point contract

For a new chat without an explicit target, first offer exactly two choices: **Chat with Chatter** (initially focused/default) and **Choose another agent**. Enter immediately proceeds with Chatter, without a second specialist picker. The second choice opens the complete available target-agent list, including hidden/core roles and Expert, subject to normal resolution and valid-speaker rules. User, Void and Null are not targets. An explicit target bypasses the picker; a noninteractive new-chat request with no target uses Chatter without prompting.

This applies to `ptbk chat`, the dashboard new-chat shortcut and browser/API entry. Existing chats and agent-authored waiting conversations retain their original participants; opening Fixer's question does not redirect it to Chatter. If Chatter is missing or invalid, give an actionable setup/repair diagnostic rather than silently choosing another agent, overwriting a file or initializing a project just by opening a picker.

Chatter is the **project’s spokesperson**: the usual conversational gateway and author of [project briefs](../../cli/project-report.md), not the boss of other agents. Ordinary periodic/event-driven work appends to root `report.book`, with normal editable policy/learning. No Reporter role or privileged worker is added; viewer/status reads never generate work and Discuss report creates a new seeded chat.

## Acceptance outcomes

Initialize a project and verify one editable Chatter with all other initialized teammates. Enter through direct chat, terminal shortcut and browser: Enter chooses Chatter; the second option reveals every valid alternative; explicit selection is respected. Ask about status without creating work, consult a specialist with attribution, then create authorized linked tasks through the ordinary queue. Reinit preserves customization, adds missing roles and uses [shared template reconciliation](../core-agents.md#shared-preparation-and-template-updates) for upstream changes rather than replacing project policy. Reopen another agent's waiting chat and verify that its identity, messages and required answer remain unchanged.
