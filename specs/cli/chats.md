# Durable Book conversations

[Project model](../concepts/project-model.md) · [Chat UX](chat-ui.md) · [Git persistence](git-persistence.md)

## Chat as a first-class entity

Every conversation is a project-owned `.book` document, conventionally in root-level `chats/`. It starts with **`CHAT <name>`**; the name content is identified and resolved by the same normalized name rule as agents and tasks. The CHAT keyword and filename are not logical identity, and there is **no chat ID**. The opening commitment makes the kind clear even outside `chats/`; ENTITY CHAT and directory-based inference are not canonical alternatives.

Multiple independent threads may involve the same participants. Every newly system-created thread therefore receives a descriptive name with creation date/time and a normalized collision check under [generated-name policy](generated-names.md), whether started through a CLI/UI/API or by an agent. This is preventive creation behavior, not mandatory timestamp syntax for all Chat Books. Copying a same-name chat produces an ordinary resolver collision, not a merged thread. Reopening, appending messages and recovery retain the full saved name without refreshing its date.

A chat records its participants, durable messages, attached evidence and relationships. The supported topologies are:
- **User ↔ exactly one agent**, initiated by either side. The agent may be an ordinary project agent, a hidden/core agent selected explicitly, or the engine-provided Expert. The User cannot open a conversation with itself.
- **Agent ↔ agent** for an ordinary task-scoped TEAM consultation, without requiring a human participant. It belongs to the originating task's work.
- Human-facing chats with several agents or arbitrary group chats are **future extensibility**, not an implemented requirement. Keep the representation extensible without showing unsupported participants as currently usable.

```book
CHAT Help with the expired browser login — 2026-10-18 01:25:00
CHAT MEMBER @Fixer
CHAT MEMBER @User
CHAT STATUS waiting-for-user
CHAT MESSAGE @Fixer 2026-10-18T01:25:00+02:00
The project browser session expired. Please log in using the opened browser window.
LINK {{Restore access to publishing}}
```

`CHAT MEMBER` declares participants; repeat `CHAT MESSAGE <sender> <time>` with full text and attachments in source order. These extend the same chat under the common Book grammar, without another CHAT declaration or a separate chat parser. Message timestamps have their own meaning and are distinct from ordinary date text in the chat name. `CHAT STATUS open|waiting-for-user|resolved` records durable action state; `waiting-for-user` requires a concrete question, decision or action, not just the latest speaker. User-local **read/unread markers** are distinct from action state and may be stored in ignored `.ptbk/` state; reading a message must not approve a decision. Preserve complete message text, attachments, provenance and user-specified options, without exposing secrets in logs or Git. All user-facing chat content is project material and may be sensitive; explain versioning before storage.

## Relationship to tasks and actions

Chats are **not tasks**. A user may ask about project progress or advice without creating a task; an agent may answer, then propose or (with normal authority) **create one or more ordinary tasks** during the conversation, or perform an authorized scoped action through ordinary task/authoring machinery. Neither a chat nor a LINK silently bypasses routing, tests, approval, ownership or checks. Chat↔task links are optional **many-to-many**; LINK and named references connect both ways for navigation, and views can compute incoming relationships without duplicating both directions in files. New tasks created from a conversation receive their own generated names; links use the final persisted names, not title-only guesses.

Every human-facing question, confirmation, missing login, TEAM @User consultation and exceptional runtime request is **a chat initiated/continued by an identified agent**. The initiator is the first-message sender; the request is not an anonymous alert from the environment or a separate persistent request entity. A task that needs a human answer records its task↔chat association, checkpoints, releases its ownership if safe and resumes **only on an actual valid reply**. Failed/expired responses remain distinct from approval, preserve evidence, and cannot be applied twice. Multiple pending messages must survive restarts, even if no dashboard is open. A human can continue asking clarifying questions before giving a decision; the chat is a genuine conversation, not a one-field dialog.

A committed user correction or project-specific instruction in an open agent's chat is eligible for a normal linked Teacher task under [learning](../agents/learning.md); the response must not silently mutate the agent without authorized checked work. This is how Fixer can improve after a human explains an issue, using the same mechanism as all open agents.

A User may start a new chat without opening a task or dashboard. Choose the target agent **before the first message**. The default picker shows nonhidden ordinary project agents, with an explicit way to access hidden/core agents and valid engine non-agent Expert. User, Void and Null are not selectable target speakers. The chat and its history remain accessible after terminal disconnect and can be resumed by name.

## Commit boundaries

Default policy is **commit on every accepted human-facing message**, whether written by User or by an agent; chat creation and material metadata changes also commit as their own scoped authoring operations. Use `PTBK: Chat - <chat name>` and a readable `Chat-Name: <name>` trailer, not a CHAT ID. A human answer is a real chat message and has its own commit; do not classify it as ignored runtime-only state. Complete the message write and Git commit before reporting it saved/delivered. Failed commits remain pending, recoverable and visibly unsent, not silently dropped. Explicit no-commit mode remains the only documented exception.

**Task-scoped agent↔agent chats are different**: record consultations as chat material and task evidence, but batch them with the owning task's **one result commit**, never emitting per-message commits during that task. If the task fails or waits, retain pending internal conversation/evidence safely for completion or recovery. Human-facing messages, even when spawned by a task, still have their own message commits; coordinate safely with active task changes rather than mixing ownership or taking over the Git index.

Only successful versioned operations get commits. Merely reading, opening, closing or navigating a chat, ephemeral draft changes and viewer read markers create no commit. Do not commit unrelated files, another active task's changes, session credentials or tracing secrets.

## Migration and consistency

Existing pending requests in runtime state are upgraded to the same user-facing chat abstraction without losing their original agent, reason, task checkpoint, answer options or wait state. Do not create duplicates on restart or invent a human reply. `ptbk answer` remains a compatibility entry point that selects a waiting chat and appends a message through this same service contract. Existing named sources retain their identity during [header conversion](migration.md); do not add a new creation timestamp on every upgrade. The UI/API must show who actually spoke, which agent awaits the user, and relevant task links.

The same resolver governs participants and LINKs. Collisions, missing agents, corrupted chat syntax and failed persistence are project maintenance conditions eligible for [Fixer](../agents/fixer.md), not a different request subsystem. See [TEAM](team.md), [human conversations](user-interactions.md), [API](api.md) and [channels](channels.md).

## Acceptance outcomes

Open two independently named threads with the same agent, including two creations sharing a clock tick. Each receives a typed CHAT declaration, date/time text and a distinct final normalized name. In one, ask a read-only project question; in another, create two linked tasks after conversational clarification. No task appears merely from opening the first chat. Agent-started request, human follow-up, reply and task resume survive restart without renaming or duplicating the thread. Every human-facing message gets exactly one scoped commit (or explicit no-commit outcome); a two-agent TEAM exchange inside one task appears in that task's one result commit. Opening/closing or reading never creates commits or loses messages; an otherwise valid undated chat remains usable.
