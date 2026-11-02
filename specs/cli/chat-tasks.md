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

When a human reply/action is genuinely needed, the asking agent uses **`+@User` or `+{User}`**. Task/TEAM/typed question helpers that receive a structured question without that literal prefix save it through the same canonical User-ping operation, preserving author/text/options/checkpoint rather than bypassing chat or creating another alert. Existing User membership is not duplicated. A new deliberate ping is new attention; recovery of the same question is not. Provide this convention in effective agent instructions.

Chat and task detail show **one logical question**, sharing its answer/state. A response from either surface is saved once and reaches the asking agent. Clear that question's attention immediately on accepted user save, before provider processing/Git batching. Other questions retain their state. Resumption still validates authority, prerequisites, lifecycle and file ownership.

The task and chat presentations also share one durable seen state under [notifications](notifications.md#seen-is-separate-from-resolved). Seeing the actual calling message clears its alert in both surfaces and all clients, but retains the pending question/card/checkpoint and cannot unblock execution. Do not emit separate task and chat notifications for that same occurrence.

Reply-to-question routes to its author; explicit active invitation/address (`+@Name` or `+{Full Name}`) targets that agent; otherwise the original main agent handles the message. If no suitable linked chat exists, create/link the ordinary attributed agent-to-User conversation. Never create a duplicate just because a different specialist executes the task.

## Acceptance outcomes

Create tasks from a chat, inspect live cards in two dashboards and observe starts/waits/outcomes. Both Books contain full-name links and TASK ORIGIN identifies the source. A specialist joins, asks there, receives an answer from task detail and resumes once when eligible. Attention clears on saved response while another unresolved question stays pending. Change the title and restart during link/message persistence without broken provenance, duplicate outcomes or inline heavy execution.

An agent can answer chat while holding one active or waiting task. Substantial newly requested execution queues as another ordinary task; it cannot bypass the [one-task-per-agent reservation](concurrency.md#one-unfinished-started-task-per-agent). Preserve a quick status/authoring response while the long-running task keeps its ownership and provenance.

## Amend existing work without losing provenance

Follow [task control](task-control.md) to query, delegate, change, accept, cancel or subscribe to work already in progress. Persist verified original user intent and any interpreted instruction; later chats may be linked without overwriting creation TASK ORIGIN. Append TASK CHANGE and applicable state/schedule controls. Reopen the same work with TASK REOPEN rather than manufacturing another task; new fundamental work has a new linked task. Source cards show the actual reopened/cancelled/retired outcome and session receipts. Saved changes still need delivery/application in all affected sessions; pending native takeover/pause/unsupported controls remain visible.
