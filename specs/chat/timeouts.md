# Timeouts (Scheduled Wake-ups)

Timeouts let a durable chat schedule **future wake-ups**: at the due time the server injects a synthetic message into the chat and runs a normal agent turn — no user action required. State lives in `prefix_UserChatTimeout` ([Data model](../data-model.md#prefix_userchattimeout)); each timeout points to a persisted [user chat](user-chats.md), including the agent's singleton [goal chat](goal-chat.md).

## Timeout operations

Agents manage planned messages through four runtime tools backed by the same durable timeout service:

| Tool             | Behavior                                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `set_timeout`    | Start a message in the agent's **singleton goal chat** with the schedule described below. The target stays the same when the tool is called from another chat.                                                                                     |
| `update_timeout` | Change the schedule or the text of one planned message **without losing its id**. Only the named fields change, `null` removes a bound, and a message which is firing right now reports `busy` instead of being changed underneath its own firing. |
| `list_timeouts`  | List the agent's planned-message ids, whole schedules, next due times, states, and messages. Active messages are returned by default; finished rows can be requested explicitly.                                                                   |
| `cancel_timeout` | Stop one active planned message by id within the current agent scope, which also stops its remaining repetitions.                                                                                                                                  |

## Schedule of a planned message

One planned message follows exactly one recurrence rule, optionally bounded, which makes it repeating, one-off, or anything between:

| Field            | Meaning                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `milliseconds`   | Fixed repeat interval of at least one minute (stored as `recurrenceIntervalMs`).                         |
| `cronExpression` | Five-field cron evaluated in the server time zone, **mutually exclusive** with `milliseconds`.           |
| `maxRunCount`    | How many times in total the message wakes the agent — `1` makes it a one-off.                            |
| `startsAt`       | The message never wakes the agent before it; an interval schedule fires for the first time exactly then. |
| `endsAt`         | The message never wakes the agent after it.                                                              |

`resolvePlannedMessageDueAt` is the single place resolving all of this: it answers when a message fires first, when it fires again, and `null` once the plan is over. A `set` whose schedule has no wake-up ahead is rejected, and an `update` which would leave none says to cancel the message instead.

## Timeout record

`id` (TEXT), chat/user/agent scope FKs, `status` (`QUEUED → RUNNING → COMPLETED | FAILED | CANCELLED`, where a repeating timeout returns to `QUEUED` after each firing), `message` (optional wake-up text), `durationMs`, `dueAt`, the schedule fields `recurrenceIntervalMs` / `cronExpression` / `startsAt` / `endsAt` / `maxRunCount`, `runCount` / `lastFiredAt` (firing history), `pausedAt` (pause marker), lease/attempt bookkeeping like [jobs](user-chats.md#job-lifecycle).

## Firing pipeline

A dedicated timeout worker (bootstrapped in-process; also triggerable via the [internal workers API](../api/internal-workers.md) on cron ticks) runs:

1. **Recovery** — expired `RUNNING` leases are recovered first (as with jobs).
2. **Claim** — the worker claims due rows (`status=QUEUED`, `dueAt <= now`, not paused; optimistic claim; bounded batch per tick). Local one-shot timers arm wake-ups near the earliest `dueAt` so firing does not wait for the next cron tick.
3. **Checks** — the claim is dropped (cancelled) when cancellation was requested, when the chat no longer exists, or when the **schedule is already over** (`endsAt` passed or `maxRunCount` reached), so a wake-up delayed past its own plan is never fired late. When the chat already fired `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT` timeouts this UTC day, the timeout is marked `FAILED` and a warning message is appended to the chat transcript.
4. **Wake-up turn** — a synthetic message is enqueued as a regular [chat turn](user-chats.md#sending-a-turn):
    - content: `⏱️ Planned message elapsed, <schedule>.` (or `⏱️ Timeout elapsed after <durationMs>ms.` when it is a plain wake-up) + `timeoutId: <id>` + the optional message, where the schedule is rendered by the shared `describeAgentPlannedMessageSchedule` and therefore also says how many of the planned runs are done;
    - `clientMessageId` is derived from the timeout id and its `runCount` → firing is **idempotent** (a crashed worker cannot double-fire the same repetition, while the next repetition still queues its own turn);
    - the job worker is triggered immediately with the new job preferred.
5. **Completion or repetition** — a timeout with a recurrence rule is **re-armed in place** (`status` back to `QUEUED`, `dueAt` = the next wake-up its schedule allows, `runCount + 1`, `lastFiredAt` set), so one repeating plan keeps one row, one id, and one cancellation point for its whole life; a timeout that does not repeat, one whose schedule is over, and one cancelled while firing are all marked `COMPLETED`. Failures to trigger mark the timeout `FAILED`, and a failed repetition appends a transcript warning without undoing the fired turn.

## Limits

From [server limits](../configuration.md#server-limits): `TIMEOUT_MAX_ACTIVE_PER_CHAT` (rejects new `set_timeout` calls with a message listing the limit — a repeating plan stays active until its schedule is over or it is cancelled) and `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT` (fails firings beyond the daily cap, counted from the timeouts that reached `COMPLETED` today). A `set_timeout` interval shorter than one minute is rejected, and cron has a one-minute resolution, so a repeating plan can never become a busy loop.

## Pause and resume

A timeout can be **paused** (`pausedAt` set) without losing its schedule; paused rows are never claimed. Resuming clears `pausedAt`.

## User-facing surfaces

Scheduled timeouts are the **planned messages** of the agent and are surfaced in its
[goal chat](goal-chat.md), which replaced the former standalone timer dashboard.

| Surface                                                | Behavior                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /agents/:agentName/api/timeouts`                  | List every planned message of this agent (all chats, all users). Requires goal-chat access.                                          |
| `DELETE /agents/:agentName/api/timeouts/:timeoutId`    | Cancel one planned message. Requires goal-chat access.                                                                               |
| `POST …/user-chats/:chatId/timeouts/:timeoutId/cancel` | Chat-scoped cancel ([User chats](user-chats.md#endpoints)).                                                                          |
| `/agents/:agentName/goal`                              | Opens the agent goal chat, which lists the planned messages with their next due time, recurrence rule, run counter, and date window. |

Scheduled timeouts are also included in the canonical chat payload/snapshots so viewers see pending timers live; schedule changes notify the [snapshot stream](user-chats.md#snapshot-stream).
