# Timeouts (Scheduled Wake-ups)

The `USE TIMEOUT` commitment lets an agent schedule **future wake-ups of a durable chat**: at the due time the server injects a synthetic message into the chat and runs a normal agent turn — no user action required. State lives in `prefix_UserChatTimeout` ([Data model](../data-model.md#prefix_userchattimeout)); timeouts exist only for [user chats](user-chats.md) (a signed-in user + agent scope).

## Model tools

When the book declares `USE TIMEOUT`, the compiled requirements include four tools (runtime adapter bound to the current chat scope):

| Tool | Behavior |
| --- | --- |
| `set_timeout` | Schedule a wake-up of the **current** chat thread after a duration, with an optional message and optional `recurrenceIntervalMs`. Rejected with an explanatory message when the chat already has `TIMEOUT_MAX_ACTIVE_PER_CHAT` active timers. |
| `list_timeouts` | List timeout ids/details across **all chats of the same user + agent scope** (paged, bounded page size). |
| `cancel_timeout` | Cancel one timeout by id, or all active ones in the scope with `allActive: true`. |
| `update_timeout` | Modify one scheduled timeout (due time / message / recurrence) by id. |

The `USE TIMEOUT` system-message section explains these tools to the model.

## Timeout record

`id` (TEXT), chat/user/agent scope FKs, `status` (`QUEUED → RUNNING → COMPLETED | FAILED | CANCELLED`), `message` (optional wake-up text), `durationMs`, `dueAt`, `recurrenceIntervalMs` (in `parameters`), `pausedAt` (pause marker), lease/attempt bookkeeping like [jobs](user-chats.md#job-lifecycle).

## Firing pipeline

A dedicated timeout worker (bootstrapped in-process; also triggerable via the [internal workers API](../api/internal-workers.md) on cron ticks) runs:

1. **Recovery** — expired `RUNNING` leases are recovered first (as with jobs).
2. **Claim** — the worker claims due rows (`status=QUEUED`, `dueAt <= now`, not paused; optimistic claim; bounded batch per tick). Local one-shot timers arm wake-ups near the earliest `dueAt` so firing does not wait for the next cron tick.
3. **Checks** — the claim is dropped (cancelled) when cancellation was requested or the chat no longer exists. When the chat already fired `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT` timeouts this UTC day, the timeout is marked `FAILED` and a warning message is appended to the chat transcript.
4. **Wake-up turn** — a synthetic message is enqueued as a regular [chat turn](user-chats.md#sending-a-turn):
    - content: `⏱️ Timeout elapsed after <durationMs>ms.` + `timeoutId: <id>` + the optional message;
    - `clientMessageId` is derived from the timeout id → firing is **idempotent** (a crashed worker cannot double-fire);
    - the job worker is triggered immediately with the new job preferred.
5. **Completion** — the timeout is marked `COMPLETED`; failures to trigger mark it `FAILED` and append a transcript warning.
6. **Recurrence** — a completed timeout with `recurrenceIntervalMs` schedules its successor row (`dueAt = completion + interval`); recurrence-scheduling failures append a transcript warning but do not undo the fired turn.

## Limits

From [server limits](../configuration.md#server-limits): `TIMEOUT_MAX_ACTIVE_PER_CHAT` (rejects new `set_timeout` calls with a message listing the limit) and `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT` (fails firings beyond the daily cap).

## Pause and resume

A timeout can be **paused** (`pausedAt` set) without losing its schedule; paused rows are never claimed. Resuming clears `pausedAt`. Pause/resume/cancel exist per timeout and as bulk actions over the whole user + agent scope.

## User-facing surfaces

| Surface | Behavior |
| --- | --- |
| `GET /agents/:agentName/api/timeouts` | List the caller's timeouts with this agent (all chats of the scope). Session required. |
| `PATCH /agents/:agentName/api/timeouts/:timeoutId` | Update schedule/message/pause state. |
| `DELETE /agents/:agentName/api/timeouts/:timeoutId` | Cancel. |
| `POST /agents/:agentName/api/timeouts/actions` | Bulk actions: `cancelAllActive`, `pauseAllActive`, `resumeAllPaused`. |
| `POST …/user-chats/:chatId/timeouts/:timeoutId/cancel` | Chat-scoped cancel ([User chats](user-chats.md#endpoints)). |
| `/agents/:agentName/timeouts` page | Timer dashboard for the agent scope. |

Scheduled timeouts are also included in the canonical chat payload/snapshots so viewers see pending timers live; schedule changes notify the [snapshot stream](user-chats.md#snapshot-stream).
