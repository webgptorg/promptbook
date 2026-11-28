# User Chats (Durable Chats)

Durable chats are persistent, server-owned conversations between one signed-in **user** and one **agent**. Unlike [stateless chat](stateless-chat.md), the turn survives client disconnects: sending a message enqueues a background **job**; any number of viewers can watch its progress through canonical snapshots.

State lives in `prefix_UserChat` / `prefix_UserChatJob` / `prefix_UserChatTimeout` ([Data model](../data-model.md#conversations)).

## Scope and access

Every endpoint under `/agents/:agentName/api/user-chats` resolves a **scope**: current user id, agent `permanentId`, and whether the viewer is admin. Failures: 401 (no session), 403 (agent not accessible or [private mode](../chats.md#private-mode) enabled — durable chats MUST be unavailable in private mode), 404 (agent unknown). Users only see their own chats; admins may view others' chats via the [Task manager](../ui/admin.md).

## Chat record

-   `id` — client-generated TEXT id (so a chat can be created optimistically offline).
-   `messages` — the canonical JSON array of chat messages `{ id, sender/role, content, createdAt, attachments?, replyingTo?, isComplete?, jobId?, … }`. Message ids are 14-char random base58 strings.
-   `draftMessage` — unsent input persisted per chat (`PUT …/:chatId/draft`), cleared when a turn is sent.
-   `title` — optional, user-editable or derived; `lastMessageAt` orders chat lists.
-   `source` — `WEB_UI` (normal), `OPENAI_API`, or `TEAM_MEMBER`.

### Frozen chats

Chats with source `TEAM_MEMBER` (and OpenAI-compat persisted conversations) are **frozen**: read-only records of conversations that happened through another channel ([stateless team calls](stateless-chat.md), [OpenAI compatibility](../api/openai-compatibility.md)). Mutating endpoints MUST reject them.

## Endpoints

| Route (`/agents/:agentName/api/user-chats…`) | Method | Behavior |
| --- | --- | --- |
| `` | GET | List the caller's chats with this agent (summaries: id, title, lastMessageAt, pending state). |
| `` | POST | Create a chat (client-supplied id). |
| `/:chatId` | GET | Canonical chat detail payload (messages + jobs + timeouts); triggers runner synchronization (below). |
| `/:chatId` | PATCH/DELETE | Rename (title) / delete the chat (cascades jobs & timeouts). |
| `/:chatId/draft` | PUT | Persist the draft message. |
| `/:chatId/messages` | POST | **Send a turn** (below). |
| `/:chatId/stream` | GET | [Snapshot stream](#snapshot-stream). |
| `/:chatId/jobs/:jobId/cancel` | POST | Request cancellation of a queued/running job. |
| `/:chatId/timeouts/:timeoutId/cancel` | POST | Cancel a scheduled [timeout](timeouts.md). |

## Sending a turn

`POST …/messages` body: `{ clientMessageId, message, attachments?, replyingTo? }`.

1. `clientMessageId` is the **idempotency key**: re-sending the same id MUST NOT enqueue a second job (the existing job is returned; a uniqueness violation is treated as retry).
2. Atomically (`appendQueuedUserChatTurn`):
    -   insert a `UserChatJob` row (`status=QUEUED`, fresh 14-char ids for job / user message / assistant message),
    -   append **two** messages to the chat: the user message and a **placeholder assistant message** bound to the job (`jobId`), marked incomplete,
    -   validate reply references, clear the draft, bump `lastMessageAt`.
3. Fire-and-forget **trigger** of the job worker (`triggerUserChatJobWorker` calls the [internal worker route](../api/internal-workers.md) with `preferredJobId`), so processing starts immediately without waiting for the cron tick.
4. Respond with the canonical chat payload (client renders the queued state at once).

Replies: a message may reference an earlier message (`replyingTo`); the job stores `repliedToThreadId`/`repliedToMessageId`; references MUST point to existing messages of the same chat.

## Job lifecycle

`QUEUED → RUNNING → COMPLETED | FAILED | CANCELLED`

-   **Claiming** — a worker claims the oldest `QUEUED` job (bounded candidate scan, optimistic compare-and-set so exactly one worker wins) and sets `status=RUNNING`, `startedAt`, `leaseExpiresAt = now + 10 min`.
-   **Heartbeats** — while working, the lease is renewed (`lastHeartbeatAt`, bounded 10 s per renewal query); assistant-message content snapshots are persisted at most every 5 s.
-   **Recovery** — before claiming, workers recover expired `RUNNING` jobs (lease elapsed): mark `FAILED` with structured diagnostics (`failureReason`, `failureDetails`), so a crashed worker can never wedge a chat.
-   **Cancellation** — `…/jobs/:jobId/cancel` sets `cancelRequestedAt`; runners MUST honor it and finalize as `CANCELLED`.
-   **Retry** — admins can retry failed jobs ([Task manager](../ui/admin.md)); `attemptCount` increments.
-   **Finalization** — the placeholder assistant message is filled with the answer (or the [failure message](../chats.md#failure-message) styling on failure), `completedAt` set, and a [push notification](../users/settings-and-notifications.md#push-notifications) is sent to the user's subscriptions unless that chat is currently focused.

## Agent runner

Jobs are answered by a pluggable **runner** (recorded in `job.provider`). The reference implementation ships the **local agent-folder runner** (`provider='local-agent-runner'`), designed for a coding-agent harness (`ptbk coder`) running next to the server:

1.  **Enqueue** — a claimed job is mirrored into the agent's folder under the root from `PTBK_AGENTS_SERVER_AGENT_ROOT`:
    -   `<agentDir>/agent.book` — current agent source (kept in sync),
    -   `<agentDir>/knowledge/` — knowledge folder,
    -   `<agentDir>/messages/queued/<date>-<chat>-<job>.book` — the pending thread serialized as a messages-book (prior thread + the new user message),
    -   `messages/finished/`, `messages/failed/` — outcome folders.
    Runner metadata (paths, `expectedMessagesBeforeAnswer`, queue time) is stored under a reserved key in `job.parameters`.
2.  **Answer** — the external harness reads the queued book, appends the `AGENT` answer message, and moves the file to `messages/finished/` (or `messages/failed/`).
3.  **Synchronize** — on worker ticks and on chat reads, the server checks outcome folders:
    -   finished file with the expected `AGENT` turn → job `COMPLETED`, answer written to the placeholder message;
    -   failed file → `FAILED` with a reason parsed from the book (or a default);
    -   answer timeout (30 min) → `FAILED` (timeout diagnostics);
    -   repeated failures beyond the `LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS` [limit](../configuration.md#server-limits) stop retries; `LOCAL_AGENT_RUNNER_MAX_PARALLEL_MESSAGES` caps concurrent harness answers.

Compatible implementations MAY provide other runners (e.g. in-process model execution) provided the job state machine, idempotency, lease/heartbeat/recovery semantics, and canonical-message updates are preserved.

## Snapshot stream

`GET …/:chatId/stream` returns an unbounded response of **newline-delimited JSON frames**:

```jsonc
{"type":"snapshot","payload":{ /* canonical chat detail payload */ }}
{"type":"keepalive"}
```

-   A snapshot is emitted immediately, then whenever chat state changes; polling cadence adapts: ~1.5 s while background work is pending, ~10 s when idle; keep-alives use the shared 25 s interval.
-   The payload is the same canonical shape as `GET …/:chatId`, so any number of concurrent viewers converge on identical state (multi-device, admin observation).
-   The stream MUST honor client disconnects promptly.

## Progress cards

While a job runs, tool/harness activity is surfaced to viewers as a **progress card** derived from the latest visible action (harness step highlights), embedded in the pending assistant message payload.
