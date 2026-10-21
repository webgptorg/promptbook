# Durable Book conversations

[Project model](../concepts/project-model.md) · [Chat UX](chat-ui.md) · [Git persistence](git-persistence.md)

## Chat as a first-class entity

Every conversation is a project-owned `.book`, conventionally in root `chats/`, starting with **`CHAT <name>`**. The name content uses the same normalized identity/resolver as agents/tasks. CHAT itself and the filename are not identity; there is no chat ID. The declaration makes kind clear outside the conventional folder; ENTITY CHAT or directory inference is not canonical.

Several independent threads may involve the same participants. Each new system-created thread receives a descriptive name with creation date/time and normalized collision checks under [generated-name policy](generated-names.md), whether user- or agent-initiated. This is preventive authoring, not timestamp syntax required for existing Books. A copied same-name chat is a resolver collision, not a merged thread. Reopening/appending/recovery preserves the saved name/date.

Supported conversation topologies are:

- **User ↔ exactly one agent**, initiated by either side. The agent can be Chatter, another project/core agent or Expert. User cannot converse with itself.
- **Agent ↔ agent** for a bounded TEAM consultation scoped to an executing task or an originating human-facing conversation. It retains its two actual participants and provenance; it is not a hidden task or a new human group chat.
- Human-facing multi-agent/arbitrary group chats remain future extensibility, not a current requirement.

```book
CHAT Help with the expired browser login — 2026-10-18 01:25:00
CHAT MEMBER @Fixer
CHAT MEMBER @User
CHAT STATUS waiting-for-user
CHAT MESSAGE @Fixer 2026-10-18T01:25:00+02:00
The project browser session expired. Please log in using the opened browser window.
LINK {Restore access to publishing}
```

CHAT MEMBER declares participants; repeat CHAT MESSAGE with sender/time, full text and attachments in source order. Extend the same Book using the common grammar, not another CHAT declaration/parser. Message timestamps are distinct from date text in its name. CHAT STATUS open/waiting-for-user/resolved records durable action state; waiting requires an actual question/decision/action, not merely the latest speaker. Local read/unread markers are separate, optionally in ignored `.ptbk/`; reading is not approval. Preserve full text, attachments, options and provenance while excluding secrets. Explain that versioned conversation content may be sensitive.

## Relationship to tasks and actions

Chats are not tasks. A user can enquire about status/advice without creating work. With ordinary authority an agent may propose/create one or more named tasks or perform a basic scoped action through ordinary authoring/task machinery. Chats/LINKs never bypass routing, checks, approval, ownership or pause. Chat↔task links remain optional and many-to-many; directed named references support incoming/outgoing navigation without redundant inverse writes. New linked tasks get their own generated names; use the final persisted names, not guessed titles.

[Chatter](../agents/chatter.md) is the default manual entry when the user does not know which specialist to choose. It answers/clarifies and consults appropriate teammates while remaining the human-facing speaker; specialist execution follows ordinary tasks. Read-only TEAM advice may be a linked internal conversation-scoped chat without a task. Record its actual author/scope under [TEAM](team.md), not an unannounced participant switch or a claim that advice was implemented.

Every human-facing question, confirmation, login need, TEAM User consultation or exceptional runtime request is initiated/continued by an identified agent in a chat. It is not an anonymous environmental alert or separate persistent Request object. A genuinely waiting task links the chat, checkpoints and releases task ownership when safe, resuming only after a valid actual reply. Failed/expired responses are not approval; preserve evidence and never apply an answer twice. Pending messages survive engine restart without viewers. Humans can ask follow-up questions before deciding; the thread is not a one-field form.

A committed correction/instruction in an OPEN agent's chat can create an ordinary linked Teacher task under [learning](../agents/learning.md). The response does not silently edit its agent Book without authorized checked work. This applies to Chatter, Fixer and any other open agent.

New human-chat entry without an explicit target first offers **Chat with Chatter** (default/Enter) and **Choose another agent** (full valid target list, including core/hidden and Expert). Noninteractive default is Chatter; explicit targets are respected. User/Void/Null are not selectable. Reopening an existing thread or waiting request retains its original speaker. Missing Chatter is a setup/repair diagnostic, not an implicit replacement or project initialization. Direct chat needs no dashboard; closing it leaves service/history intact.

## Commit boundaries

Every accepted human-facing message, from User or an agent, receives its own scoped commit by default; creation/material metadata changes are ordinary scoped authoring operations. Use `PTBK: Chat - <chat name>` and `Chat-Name: <name>`, not CHAT ID. A human answer is a real independently committed message. Report saved/delivered only after write and required commit. Failed persistence stays visibly pending/recoverable, not silently dropped. Explicit no-commit remains the exception.

Task-scoped internal agent messages are saved with their owning task's **one result commit**, never per-message side commits during that task. Retain unfinished/waiting consultation evidence for completion/recovery. Human-facing messages spawned from tasks still have their own commits, coordinated safely with active writes.

Internal agent consultations serving a conversation with no owning task use ordinary scoped authoring persistence for the bounded exchange, linked to the parent chat. They do not wait for an unrelated task result or create a fake completed task. This does not change human-message or task-result commit boundaries.

Only actual versioned operations create commits. Reading, opening, closing/navigating, ephemeral drafts and read markers do not. Never commit another task's changes, unrelated files, session credentials or tracing secrets.

## Migration and consistency

Upgrade legacy pending requests into this chat abstraction without losing actual agent, reason, task checkpoint, answer choices or wait state. Do not duplicate on restart or invent replies. `ptbk answer` remains a compatibility path that selects a waiting chat and appends through this contract. Existing names survive [header conversion](migration.md); do not refresh timestamps on upgrade. UI/API shows actual authors, waiting agent and relevant links.

The same resolver governs participants/LINKs. Collisions, missing agents, malformed Books and failed persistence are [Fixer](../agents/fixer.md) maintenance conditions, not another request subsystem. Chatter's default entry does not absorb existing authored requests or alter their authority.

## Acceptance outcomes

Create separate same-agent chats, including same-title/same-tick creation, with distinct normalized generated names. Enter via Chatter by default, select alternatives explicitly and reopen existing requests without rerouting them. Ask read-only status, consult a specialist with a linked two-agent exchange, then create two ordinary authorized tasks from another thread. Opening alone creates no work. Preserve agent-started question, human clarification/reply and once-only resume through restart. Human-facing messages commit individually; task-internal consultation belongs to its task result; conversation-only consultation has scoped authoring persistence without fake tasks. Read/close/navigation create no commits or lost messages, and valid undated Books remain usable.
