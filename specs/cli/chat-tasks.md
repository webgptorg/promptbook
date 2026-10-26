# Task work linked to its conversation

[Chats](chats.md) · [Task relationships](task-relationships.md) · [Human interactions](user-interactions.md) · [References](../book-language/references.md)

## Durable provenance

Chat manages work; tasks execute substantial work. Creating a task from chat persists final global **Book names** in both sources: the chat has `LINK {Task name}`; the task has `LINK {Chat name}` and `TASK ORIGIN Chat {Chat name}`. Use `@Name` for a single-word name or single `{Full Name}` braces otherwise. Do not invent UUIDs, filename IDs or title-only guesses. General LINK edges remain directed; this creation operation intentionally saves both directions.

A chat can create several tasks and a task can have other related chats. TASK ORIGIN identifies the default return conversation, not every incidental LINK target. Preserve references/provenance through recovery and deliberate renames. An evolving CHAT TITLE cannot break them.

Save ordinary tasks with existing authority, routing, dependencies, priority and checks. Return confirmation/live reference promptly, without waiting for execution. Under pause tasks stay queued. Interrupted cross-file publication reconciles idempotently rather than creating duplicate tasks, cards or outcomes.

## Live card and outcome

A compact task box/card in the source chat shows readable name/title, real state and navigation to normal task detail. Update queued, running, waiting/blocked and completed/failed/interrupted observations from the same engine state as Tasks; these are presentation, not new engine lifecycle states. Several clients see matching updates.

Completion appends a concise attributed result and artifact links to the source chat. A failed/blocked task cannot announce success; progress is not a completed result. Preserve the card/history and deliver each actual outcome once across restart/reconnect.

## Questions and participants

Ordinary task clarification reuses the originating/designated chat. A different executing agent appends its `CHAT MEMBER` before its first `CHAT MESSAGE`, asks under its **own** name and can report results directly. Chatter need not relay/impersonate it; User plus multiple agents is supported.

Chat and task detail show **one logical question**, sharing its answer/state. A response from either surface is saved once and reaches the asking agent. Clear that question's attention immediately on accepted user save, before provider processing/Git batching. Other questions retain their state. Resumption still validates authority, prerequisites, lifecycle and file ownership.

Reply-to-question routes to its author; explicit agent mention targets that participant; otherwise the original main agent handles the message. If no suitable linked chat exists, create/link the ordinary attributed agent-to-User conversation. Never create a duplicate just because a different specialist executes the task.

## Acceptance outcomes

Create tasks from a chat, inspect live cards in two dashboards and observe starts/waits/outcomes. Both Books contain full-name links and TASK ORIGIN identifies the source. A specialist joins, asks there, receives an answer from task detail and resumes once when eligible. Attention clears on saved response while another unresolved question stays pending. Change the title and restart during link/message persistence without broken provenance, duplicate outcomes or inline heavy execution.
