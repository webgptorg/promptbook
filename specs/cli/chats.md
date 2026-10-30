# Durable Book conversations

[Project model](../concepts/project-model.md) · [Chat UX](chat-ui.md) · [Chat/task relationships](chat-tasks.md) · [Git persistence](git-persistence.md)

## Conversation, identity and title

Every conversation is a project-owned `.book`, conventionally in root `chats/`, beginning **`CHAT <name>`**. Its full normalized opening name is its global name/ID under the shared resolver, independent of filename or participants. Do not create another opaque CHAT ID. New system-created names include readable creation date/time and normalized collision checks under [generated names](generated-names.md); valid existing undated names remain valid.

Several threads can have identical participants/display titles while retaining distinct opening names. Reopening, appending and recovery preserve identity. Append **`CHAT TITLE <title>`** as the topic evolves: the latest valid title wins and older values remain in the Book/Git. It never silently rewrites the opening CHAT, breaks links or refreshes creation time. Keep the full name/reference inspectable/copyable.

## Participants and authors

Human-facing chats support **User and one or more agents**, including Chatter, specialists/core roles and Expert where meaningful. Internal bounded TEAM consultations retain their two actual agents and task/conversation scope. User cannot converse with itself; Void/Null are not speakers.

The general thread model also permits agent-only conversations, one-agent reporting and a user joining later; it does not require User at creation. Add participants chronologically without rewriting prior authorship. The [first remote App](../app/integration.md#chats-agents-and-tasks) can present plain text while preserving these semantics, titles, events and streaming; simple rendering must not collapse every author into one anonymous assistant.

Each participant has a separate `CHAT MEMBER` commitment. The initially selected agent is the main conversational agent (the first agent member). A new contributing task agent joins by appending its member commitment **before** its first message; preserve prior members/chronology and the main agent. Agents do not each automatically answer every arrival.

Repeated `CHAT MESSAGE <sender-reference> <timestamp>` commitments preserve actual author, full text, attachments, options and source order using the common Book grammar. Optional phase `progress` or `final` after the timestamp distinguishes interim updates and a final reply; ordinary messages need no phase. Preserve originating-turn/question/task correlation durably without turning timestamps or transport keys into entity IDs. Literal control-looking text remains lossless and cannot change the containing Book.

```book
CHAT Discuss CSV export — 2026-10-25 23:40:00
CHAT MEMBER @User
CHAT MEMBER @Chatter
CHAT MESSAGE @User 2026-10-25T23:40:00+01:00
Please add multiline CSV export.
LINK {Add multiline CSV export — 2026-10-25 23:41:00}
CHAT MEMBER @Developer
CHAT MESSAGE @Developer 2026-10-25T23:43:00+01:00
Should the export preserve the existing column order?
CHAT STATUS waiting-for-user
CHAT TITLE Multiline CSV export and column order
```

## Conversation manages work

**Chat is primarily for discussion, clarification, status and creating/managing tasks. Substantial execution belongs to tasks.** Requests such as submitting a tax return or implementing a feature create ordinary authorized tasks and promptly return creation/status, without performing that work inline or waiting for completion. Read-only status lookup, bounded advice and task authoring can take time and show progress; they cannot become a task-execution bypass.

Persist origin and named links under [chat/task relationships](chat-tasks.md). The source chat has a live task card and receives a concise completion outcome. A task question reuses its originating/designated chat; create another only when no suitable conversation exists. Its executing agent joins and speaks under its own name.

Route a user reply to the author of the question it answers; an explicit agent mention targets that participant; otherwise the main agent handles it. Use the same `@Name`/`{Full Name}` resolver as other Books. A task mention is not an agent switch. Resolve genuinely ambiguous pending questions without broadcasting/applying one answer to every wait.

A new chat is implicitly open, with no initial status line. Append `CHAT STATUS open|waiting-for-user|resolved` at each actual transition; the last valid status determines current state. Preserve earlier commitments instead of rewriting them. Unread markers are separate. Follow [Book layering](../book-language/layering.md). Once the engine accepts/saves a user's response, clear **that question's** attention immediately, without waiting for model acceptance or Git batching. Other questions can remain pending. Reading alone is not answering; a response is not automatically approval or proof of an external prerequisite.

## Live operation and persistence

Accept/save messages promptly during work. Stream in-progress reply text and progress as the provider makes them available rather than buffering the complete answer until its end. Durable partial chunks belong to the same reply, not a new message per token; interruption retains an explicitly unfinished reply. Deliver available progress as it arrives, accept follow-up input during a turn and synchronize one ordered history across clients without duplicate provider work. Preserve available provider/harness progress or reasoning summaries and the complete actual conversation in the Book; private internal reasoning the provider does not expose is not a required output.

Different chats/tasks share [concurrent capacity](concurrency.md), not one serial chat queue. Chat and necessary routing/consultations remain eligible during scheduling pause; newly created tasks wait for resume. Stopping/force stop remain authoritative. Checkpoint human waits promptly instead of keeping a provider/MCP call open until timeout.

Messages are durable on file save and use [bounded debounced Git commits](git-persistence.md), not a mandatory commit each. Preserve Chat-Name, order and attribution. Task-internal exchanges retain result scope; conversation-only advice has compatible scoped persistence. Failed Git persistence remains visible/recoverable without losing saved answers or repeating accepted effects.

## Entry and model chronology

New human-led entry without an explicit agent offers **Chat with Chatter** (default/Enter) or **Choose another agent**. Noninteractive default is Chatter; explicit targets are respected; existing questions retain their participants. Missing/invalid Chatter is diagnosed, not silently substituted or initialized by opening the picker. Closing chat leaves service/history intact.

After saving the first User message, resolve the main agent's effective MODEL before its first reply. Reuse a fully specified agent choice; otherwise ordinary Router consultation fills missing constraints without a hidden extra worker. Source order is definition/members, first User message, MODEL, first reply, even when saves share a Git batch. Reopening does not reroute; mid-chat MODEL switching remains future work. A joined task agent retains its actual task context rather than inheriting the main speaker's MODEL.

## Migration, recovery and acceptance

Preserve legacy requests' authors, messages, choices, checkpoints and wait state during conversion. `ptbk answer` appends through the same operations. Recovery never allocates another chat/name, duplicates a response or invents a participant. OPEN-agent corrections can still create ordinary linked Teacher work; a chat response does not silently edit the agent Book.

Exercise independent/same-agent threads, several clients on one thread, input during progress and force stop before a Git batch. Recover every saved message. Verify appended titles without identity changes, joins before messages, question/mention/main-agent routing and immediate per-question attention clearing. Ask status without work; request substantial work and get a linked task/card promptly; receive its question/result in the same conversation. Preserve pause and MODEL chronology without per-message commits.

Root [`report.book`](project-report.md) explicitly uses stable `CHAT Report`, Chatter alone and appended briefs without User/self-consultation. It is not a waiting-for-user thread and appends alone create no actionable Chats notification. Generation uses ordinary Chatter work context, not a fabricated first User message. Discuss report creates a normal new `chats/` thread with an exact first Chatter snapshot and source/time provenance; first actual User input triggers ordinary MODEL resolution before a new generated reply.
