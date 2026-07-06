# API — Agent chat

Agent-scoped endpoints under `/agents/:agentName/api/...` that power conversations, plus agent inspection
endpoints. `:agentName` accepts a `permanentId` (preferred) or an `agentName`. Behavior is in
[Chat](../chat.md) and [`chat/`](../chat/).

All chat routes first resolve a **user-chat scope** (which user, which agent `permanentId`, whether the
viewer is admin) and return `401`/`403`/`404` accordingly. Routes that persist reject under
[private mode](../architecture/security-and-access.md).

## User chats

- **`GET /agents/:name/api/user-chats`** — list the current user's chats with the agent.
- **`POST /agents/:name/api/user-chats`** — create a new chat (optionally seeded). Returns the chat.
- **`GET /agents/:name/api/user-chats/:chatId`** — canonical chat detail payload: chat + messages +
  active jobs + active timeouts + draft. Reconciles/synchronizes runner state as needed.
- **`DELETE /agents/:name/api/user-chats/:chatId`** — delete a chat (cascades jobs/timeouts).
- **`PUT /agents/:name/api/user-chats/:chatId/draft`** — save the composer draft (`draftMessage`).

## Sending a message

**`POST /agents/:name/api/user-chats/:chatId/messages`**

Body: `{ clientMessageId, message?, attachments?, parameters?, threadId?, repliedToMessageId? }`.

1. Rejects if [private mode](../architecture/security-and-access.md) is on (403).
2. Validates: `clientMessageId` required; `message` a string; content passes
   [validation](../chat/message-lifecycle.md); at least text **or** attachments present.
3. Rejects if the chat is **frozen** (view-only, 403).
4. Requires the agent's [disclaimer](../chat/message-lifecycle.md) to be accepted (else 403).
5. Resolves any reply target (`threadId`/`repliedToMessageId`).
6. **Idempotent**: if a job already exists for `(chatId, clientMessageId)`, returns it instead of duplicating.
7. Appends the user turn, creates a `QUEUED` [job](../chat/execution-model.md), triggers a worker, and
   returns the updated chat detail + the job with **HTTP 202**.

## Streaming

**`GET /agents/:name/api/user-chats/:chatId/stream`**

A long-lived **NDJSON** stream (`Content-Type: application/x-ndjson`, `maxDuration` 300s) that emits
newline-delimited frames:

- `{"type":"snapshot","payload":<chat detail payload>}` — emitted whenever the user-visible state changes.
- `{"type":"keepalive"}` — periodic heartbeat.

The server **polls** the chat state (fast cadence ~1.5s while jobs/timeouts are active, ~10s when idle),
computes a change signature, and only sends a snapshot when it changes. Closes on client disconnect, when
the chat disappears, or when the chat is frozen with no active work. See [Streaming](../chat/streaming.md).

## Jobs

- **`GET /agents/:name/api/user-chats/:chatId/jobs`** *(where present)* / job state is included in the
  chat detail and stream snapshots (`activeJobs`).
- **`POST /agents/:name/api/user-chats/:chatId/jobs/:jobId/cancel`** — request cooperative cancellation of a
  running/queued job (sets `cancelRequestedAt`). See [Chat execution](../chat/execution-model.md).

## Timeouts

Scheduled wake-ups for the `USE TIMEOUT` capability. See [Timeouts & scheduling](../chat/timeouts-and-scheduling.md).

- **`GET /agents/:name/api/timeouts`** — list the agent's timeouts for the user.
- **`GET|…/agents/:name/api/timeouts/:timeoutId`** — one timeout.
- **`POST /agents/:name/api/timeouts/actions`** — bulk actions (pause/resume/cancel).
- **`GET /agents/:name/api/user-chats/:chatId/timeouts`** — timeouts scoped to a chat.
- **`POST /agents/:name/api/user-chats/:chatId/timeouts/:timeoutId/cancel`** — cancel a chat timeout.

## Feedback

- **`POST /agents/:name/api/feedback`** — submit post-response feedback (rating, note, expected answer);
  stored in [`ChatFeedback`](../data-model/chat.md). Mode governed by `CHAT_FEEDBACK_MODE`.

## Agent inspection

- **`GET /agents/:name/api/profile`** — the agent's [profile](../book-language.md) (name, description,
  avatar, meta, capabilities…).
- **`GET /agents/:name/api/book`** — the agent's Book [source](../book-language.md); `.../book/history`
  lists versions; `.../book/reference-diagnostics` reports unresolved `{Agent}`
  [references](../agents/references-and-composition.md); `.../book/missing-agent` handles missing refs.
- **`GET /agents/:name/api/model-requirements`** — the compiled
  [model requirements](../agent-model-requirements.md); `.../system-message` returns just the system message.
- **`GET /agents/:name/api/meta-disclaimer`** — the disclaimer text + acceptance status.

## Voice, calendar, share-target (agent-scoped)

- **`/agents/:name/api/voice`** — realtime voice (gated by voice metadata). See [Voice](../features/voice.md).
- **`/agents/:name/api/calendar-connections`**, `.../calendar-connections/:id/disconnect`,
  `.../calendar-events` — [calendar](../features/calendar.md) links/events for this agent.
- **`/agents/:name/api/share-target/:shareTargetId/consume`** — consume a pending
  [share payload](../features/notifications.md) into a chat.
- **`/agents/:name/api/mcp`** — see [MCP](./mcp.md); **`/agents/:name/api/openai/...`** and
  `.../openrouter/...` — see [OpenAI-compatibility](./openai-compatibility.md).

## Related specs

- [Chat](../chat.md) · [Chat execution](../chat/execution-model.md) · [Streaming](../chat/streaming.md) ·
  [Message lifecycle](../chat/message-lifecycle.md)
- [Chat data model](../data-model/chat.md)
