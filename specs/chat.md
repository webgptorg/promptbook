# Chat

A **chat** is a persisted conversation between one user and one [agent](./agent.md). Chat is the primary way
end users interact with agents. This document is the conceptual overview; the mechanics live in
[`chat/`](./chat/).

## Key properties

- **Persisted & resumable** — every chat (`UserChat`) belongs to a `(userId, agentPermanentId)` pair and
  stores its full message list. Users can leave and return; anonymous users are given a stable identity via
  browser cookies. See [Chat data model](./data-model/chat.md).
- **Durable generation** — producing an assistant reply is a **background job** (`UserChatJob`), not a
  request/response. Once a user sends a message the reply keeps generating even if the browser disconnects,
  and is delivered when the client re-attaches. See [Chat execution model](./chat/execution-model.md).
- **Streaming** — while a reply generates, the client receives incremental deltas and progress cards over a
  server-sent-events stream. See [Streaming](./chat/streaming.md).
- **Scheduled continuations** — an agent with `USE TIMEOUT` can schedule future wake-ups that resume the
  chat later, optionally on a recurring schedule. See [Timeouts & scheduling](./chat/timeouts-and-scheduling.md).

## The turn, end to end

1. **Send.** The client POSTs a message to
   [`/agents/:name/api/user-chats/:chatId/messages`](./api/agent-chat.md) with a `clientMessageId` for
   idempotency. The server validates content, checks [private mode](./architecture/security-and-access.md)
   and [disclaimer acceptance](./chat/message-lifecycle.md), appends the user turn, and enqueues a
   `QUEUED` job. It returns the updated chat plus the job (HTTP 202) and triggers a worker.
2. **Claim.** A [worker](./chat/execution-model.md) (`/api/internal/user-chat-jobs/run`) claims the next
   queued job under a lease and marks it `RUNNING`.
3. **Compile.** The server resolves references/inheritance for the agent and compiles
   [model requirements](./agent-model-requirements.md).
4. **Generate.** A [runner](./chat/runners.md) produces the reply — via direct LLM streaming, a local
   coding-agent harness, or an external git-backed coding-agent — emitting deltas, tool calls, and progress.
5. **Persist.** The assistant message is written into the chat; the job becomes `COMPLETED` (or `FAILED` /
   `CANCELLED`). Optional follow-ups run (append-only self-learning, calendar activity logging).
6. **Deliver.** The client, attached to the [stream](./chat/streaming.md), renders the reply as it lands.

## Sources of a chat

A chat records how it originated (`source`): `WEB_UI` (the web UI), `OPENAI_API` (via the
[OpenAI-compatible API](./api/openai-compatibility.md)), or `TEAM_MEMBER` (a teammate agent calling this
one). Chats imported from external systems can be **frozen** (view-only in the web UI). See
[Chat data model](./data-model/chat.md).

## Message shape & features

Messages carry text, attachments, tool calls, and reply/thread metadata. Features layered on top include
attachments/uploads, replies within a thread, a hardcoded per-agent message suffix, quick-action buttons,
citations, and feedback (ratings). See [Message lifecycle](./chat/message-lifecycle.md),
[File uploads](./features/file-uploads.md), and [Feedback](./features/admin.md).

## History & telemetry vs. user chats

There are **two** stores:

- **`UserChat`** — the live, per-user, resumable conversation (this document).
- **`ChatHistory`** — an append-only telemetry/audit log of individual message events (with URL, IP, user
  agent, usage, actor type, source). Suppressed under [private mode](./architecture/security-and-access.md).

See [Chat data model](./data-model/chat.md) for both.

## Related specs

- [`chat/`](./chat/): [execution model](./chat/execution-model.md) · [runners](./chat/runners.md) ·
  [streaming](./chat/streaming.md) · [timeouts & scheduling](./chat/timeouts-and-scheduling.md) ·
  [message lifecycle](./chat/message-lifecycle.md)
- [Chat API](./api/agent-chat.md) · [Chat data model](./data-model/chat.md)
