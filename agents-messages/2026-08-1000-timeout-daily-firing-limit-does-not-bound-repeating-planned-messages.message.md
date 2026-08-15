# The daily timeout-firing limit no longer bounds repeating planned messages

While turning goal-chat planned messages into intervals
([`prompts/2026-08-0140-agents-server-goal-chat.md`](../prompts/2026-08-0140-agents-server-goal-chat.md)), the daily
firing cap turned out to be incompatible with repeating wake-ups in two ways. Both are worth a decision that is bigger
than that prompt.

## 1. The cap counts rows, and a repeating timeout is one row forever

[`countCompletedUserChatTimeoutsForChatSince`](../apps/agents-server/src/utils/userChatTimeout/userChatTimeoutStore/countCompletedUserChatTimeoutsForChatSince.ts)
counts `UserChatTimeout` rows of one chat that reached `COMPLETED` today, and
[`processClaimedUserChatTimeout`](../apps/agents-server/src/utils/userChatTimeout/userChatTimeoutWorker.ts) compares
that count with `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT` (default `10`).

A repeating planned message is now re-armed in place after every firing, so it never stays `COMPLETED` and **its
repetitions are not counted at all**. The cap still works for one-shot timeouts, but the guard that used to bound how
much money one chat can spend on self-invocation no longer applies to exactly the messages that repeat forever. What
remains is `TIMEOUT_MAX_ACTIVE_PER_CHAT` (default `5`) plus the new one-minute minimum interval, which bounds the worst
case at 5 × 1440 wake-ups a day - not a budget.

Counting firings instead of rows needs state that does not exist yet: `runCount` and `lastFiredAt` are totals, so
"how many times did this row fire today" cannot be derived from them. The cheapest fix is probably one nullable column
(the `runCount` at the start of the current UTC day, or a per-day firing counter with its date) plus a count that adds
today's firings of repeating rows to the completed one-shot rows.

## 2. Even a working cap contradicts the feature it guards

The driving example of the prompt is "check emails every 5 minutes" - 288 firings a day in one chat. Any honest
enforcement of a 10-per-day cap kills that plan before the first hour is over, whether it fails the timeout (as the
current code does) or rejects short intervals when they are planned. So the default value has to be re-thought together
with the counting: either raise `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT` to something that permits minute-level plans, or
express the limit as a **minimum interval** in the admin tool-limits UI, which is what the limit really means once
planned messages repeat.

## What was done for now

Nothing beyond the interval semantics themselves: a `set_timeout` interval shorter than one minute is rejected, so a
repeating plan cannot become a busy loop. The daily cap was left exactly as it is, because raising or redefining a
spend guard is a product decision.
