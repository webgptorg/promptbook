# Data model — Chat

Tables for conversations, durable reply generation, scheduled wake-ups, telemetry, feedback, and shared
payloads. See [Chat](../chat.md) and [`chat/`](../chat/) for behavior.

## `UserChat`

One persisted conversation between a user and an agent. **String** primary key.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Chat id. |
| `userId` | bigint → `User.id` (CASCADE) | Owner (may be an anonymous-resolved user). |
| `agentPermanentId` | text → `Agent.permanentId` (CASCADE) | The agent. |
| `messages` | jsonb | Full ordered message list (default `[]`). |
| `title` | text \| null | Optional chat title. |
| `draftMessage` | text \| null | Unsent draft in the composer. |
| `source` | text | `WEB_UI` / `OPENAI_API` / `TEAM_MEMBER` (default `WEB_UI`). |
| `lastMessageAt` | timestamptz \| null | For ordering the chat list. |
| `createdAt` / `updatedAt` | timestamptz | |

Indexed for per-user/agent listing ordered by recency. `source` distinguishes web chats from imported
(**frozen**) ones and teammate-invoked chats.

### Message shape (inside `messages`)

Each message carries at least: `id`, role/actor, text content, optional `attachments`, optional `toolCalls`,
and reply/thread metadata (`threadId`, `repliedToMessageId`). Exact fields in
[Message lifecycle](../chat/message-lifecycle.md).

## `UserChatJob`

A durable unit of work that generates **one** assistant reply. **String** primary key. See
[Chat execution](../chat/execution-model.md).

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Job id. |
| `chatId` | text → `UserChat.id` (CASCADE) | |
| `userId` | bigint → `User.id` (CASCADE) | |
| `agentPermanentId` | text → `Agent.permanentId` (CASCADE) | |
| `userMessageId` | text | The user message being answered. |
| `assistantMessageId` | text | The (placeholder) assistant message being produced. |
| `clientMessageId` | text | Client idempotency key; unique per `(chatId, clientMessageId)`. |
| `status` | text | `QUEUED` / `RUNNING` / `COMPLETED` / `FAILED` / `CANCELLED`. |
| `parameters` | jsonb | Prompt parameters + runner metadata (default `{}`). |
| `provider` | text \| null | Which [runner](../chat/runners.md) handled it. |
| `queuedAt` / `startedAt` / `completedAt` | timestamptz | Lifecycle. |
| `cancelRequestedAt` | timestamptz \| null | Cooperative cancellation request. |
| `lastHeartbeatAt` / `leaseExpiresAt` | timestamptz \| null | Lease/heartbeat for durability. |
| `attemptCount` | int | Retry counter. |
| `failureReason` | text \| null | Short reason. |
| `failureDetails` | text \| null | Longer diagnostics. |
| `repliedToThreadId` / `repliedToMessageId` | text \| null | Reply target. |

Constraints/indexes enforce the queue semantics: **at most one `RUNNING` job per chat** (partial unique
index on `chatId WHERE status='RUNNING'`), FIFO claiming (`status, queuedAt, createdAt`), lease-expiry
recovery (`leaseExpiresAt WHERE status='RUNNING'`), and idempotency (`chatId, clientMessageId`).

## `UserChatTimeout`

A scheduled future wake-up inside a chat (the `USE TIMEOUT` capability), possibly recurring. **String** PK.
See [Timeouts & scheduling](../chat/timeouts-and-scheduling.md).

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `chatId` / `userId` / `agentPermanentId` | FKs (CASCADE) | Scope. |
| `status` | text | `QUEUED` / `RUNNING` / `COMPLETED` / `FAILED` / `CANCELLED`. |
| `message` | text \| null | Optional payload/reminder text. |
| `parameters` | jsonb | Default `{}`. |
| `durationMs` | bigint | Delay from creation. |
| `dueAt` | timestamptz | When it should fire. |
| `queuedAt` / `startedAt` / `completedAt` | timestamptz | Lifecycle. |
| `cancelRequestedAt` / `leaseExpiresAt` | timestamptz \| null | Cooperative cancel + lease. |
| `attemptCount` | int | |
| `failureReason` | text \| null | |
| `recurrenceIntervalMs` | bigint \| null | If set, reschedule after firing. |
| `pausedAt` | timestamptz \| null | Paused (excluded from due scans). |
| `runCount` | int | Times fired. |
| `lastFiredAt` | timestamptz \| null | |

Indexed for due scanning (`status, dueAt` where queued & not paused & not cancel-requested) and lease
recovery.

## `ChatHistory`

Append-only **telemetry/audit** log of individual message events (distinct from `UserChat`). Suppressed
under [private mode](../architecture/security-and-access.md).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity | |
| `messageHash` / `previousMessageHash` | text | Message chaining. |
| `agentName` | text | Denormalized. |
| `agentPermanentId` | text → `Agent.permanentId` (CASCADE) | |
| `message` | jsonb | The message. |
| `source` | text \| null | `AGENT_PAGE_CHAT` / `OPENAI_API_COMPATIBILITY`. |
| `actorType` | text \| null | `ANONYMOUS` / `TEAM_MEMBER` / `API_KEY`. |
| `apiKey` | text \| null | API key used, if any. |
| `userId` | bigint → `User.id` (SET NULL) \| null | Resolved user (incl. anonymous). |
| `usage` | jsonb \| null | Token/cost usage. |
| `url` / `ip` / `userAgent` / `language` / `platform` | text \| null | Telemetry. |
| `promptbookEngineVersion` | text \| null | |
| `createdAt` | timestamptz | Indexed for usage analytics. |

## `ChatFeedback`

Post-response ratings and notes. Referenced by `agentPermanentId`.

| Column | Type | Notes |
|---|---|---|
| `agentName` / `agentPermanentId` | text | Agent. |
| `agentHash` | text | Version rated. |
| `rating` / `textRating` | text \| null | Rating value(s). |
| `chatThread` | text \| null | Thread context. |
| `userNote` | text \| null | Free-text note. |
| `expectedAnswer` | text \| null | What the user expected. |
| `url` / `ip` / `userAgent` / `language` / `platform` | text \| null | Telemetry. |

See [Feedback (admin)](../features/admin.md).

## `ShareTargetPayload`

Payloads received via the Android PWA share target, pending consumption into a chat. **String** PK. See
[Notifications & share target](../features/notifications.md).

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `agentPermanentId` | text → `Agent.permanentId` (CASCADE) | Target agent. |
| `message` | text \| null | Shared text. |
| `attachments` | jsonb | Shared files (default `[]`). |
| `consumedAt` | timestamptz \| null | Set when imported into a chat. |

## Related specs

- [Chat](../chat.md) · [Chat execution](../chat/execution-model.md) ·
  [Timeouts & scheduling](../chat/timeouts-and-scheduling.md) · [Message lifecycle](../chat/message-lifecycle.md)
- [User data model](./user.md) · [Agent data model](./agent.md)
