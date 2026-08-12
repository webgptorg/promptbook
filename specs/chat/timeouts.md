# Timeouts (Scheduled Wake-ups)

Timeouts let a durable chat schedule **future wake-ups**: at the due time the server injects a synthetic message into the chat and runs a normal agent turn — no user action required. State lives in `prefix_UserChatTimeout` ([Data model](../data-model.md#prefix_userchattimeout)); each timeout points to a persisted [user chat](user-chats.md), including the agent's singleton [goal chat](goal-chat.md).

## Timeout operations

Agents manage planned messages through three runtime tools backed by the same durable timeout service:

| Tool | Behavior |
| --- | --- |
| `set_timeout` | Schedule a required future message in the agent's **singleton goal chat** after a positive millisecond delay. The target stays the same when the tool is called from another chat. |
| `list_timeouts` | List the agent's planned-message ids, due times, states, and messages. Active messages are returned by default; finished rows can be requested explicitly. |
| `cancel_timeout` | Cancel one active planned message by id within the current agent scope. |

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

A timeout can be **paused** (`pausedAt` set) without losing its schedule; paused rows are never claimed. Resuming clears `pausedAt`.

## User-facing surfaces

Scheduled timeouts are the **planned messages** of the agent and are surfaced in its
[goal chat](goal-chat.md), which replaced the former standalone timer dashboard.

| Surface | Behavior |
| --- | --- |
| `GET /agents/:agentName/api/timeouts` | List every planned message of this agent (all chats, all users). Requires goal-chat access. |
| `DELETE /agents/:agentName/api/timeouts/:timeoutId` | Cancel one planned message. Requires goal-chat access. |
| `POST …/user-chats/:chatId/timeouts/:timeoutId/cancel` | Chat-scoped cancel ([User chats](user-chats.md#endpoints)). |
| `/agents/:agentName/goal` | Opens the agent goal chat, which lists the planned messages with their due time. |

Scheduled timeouts are also included in the canonical chat payload/snapshots so viewers see pending timers live; schedule changes notify the [snapshot stream](user-chats.md#snapshot-stream).
