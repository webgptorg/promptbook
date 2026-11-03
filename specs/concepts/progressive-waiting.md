# Progressive waiting and retry scheduling

[Main specification](../_main.md) · [Retries](../cli/retries.md) · [Attention ownership](../cli/notifications.md) · [Service lifecycle](../cli/service-lifecycle.md)

## One shared waiting pattern

When a condition may change in a minute, an hour or a week and its recovery time is unknown, use **progressive waiting (exponential backoff)**. Begin with a domain-appropriate short delay, then lengthen successive intervals while the same condition persists, up to that domain's finite maximum. At the maximum, continue checking at that bounded cadence while the wait remains relevant; age alone neither resolves nor abandons it.

This is one shared scheduling policy used by engine domains, not a new Book entity, agent, permanent worker or client-side timer. Domains supply their condition, safe verification operation, owner, timing bounds and relevant change signals. Thin clients only observe the result. Keep notification revalidation distinct from retrying the blocked operation: checking whether an invoice is still missing must not submit the tax return again.

An interval can follow `min(maximum, initial × multiplier^round)`, with a multiplier greater than one. Suitable bounded spreading/jitter avoids synchronized bursts while retaining meaningful minimum/maximum intervals. Exact factors are an implementation choice; intervals must actually grow rather than repeat a short fixed poll forever. Known provider reset/availability times, explicit not-before times and useful deadlines take precedence where applicable; do not retry before a known reset or let backoff silently miss a required decision deadline.

For outstanding human-attention conditions, the default first recheck is **about one minute**. With no relevant change, intervals progressively grow and may reach **one week** for an old unchanged notice. Choose a shorter cap when the specific condition or deadline requires it. A second-scale notification loop or permanent minute-by-minute model polling is not acceptable. For example, minute-scale intervals can double through longer waits toward the cap; this is not a fixed schedule required for every domain.

## Relevant changes and cost

Prefer useful event-driven checks to waiting for the next timer: an applicable file/message change, newly usable tool, browser authentication transition or domain recovery evidence can bring a check forward. Verify actual relevance; a different invoice or another account's session does not satisfy the condition. Coalesce timer/event/manual triggers and revalidate current state immediately before applying a result.

Substantive new evidence can restart a short observation interval for the changed condition. A redraw, snapshot read, client reconnect, engine restart or unrelated file change cannot reset an old wait to its fastest cadence. A new genuinely necessary condition has its own waiting cycle. At most one applicable check may be in flight for the same condition; obsolete results cannot clear a replacement condition.

Use deterministic domain checks first. A check need not call a model, and an unchanged unavailable provider is not a reason to spend on idle inference. For [attention relevance](../cli/notifications.md), a bounded paid assessment by the responsible agent is explicitly permitted when semantic judgment is needed, including during an ordinary human wait. This is useful supervision, not another failed acceptance attempt of the blocked task. Attribute/account for actual usage, respect the configured spending authority and combine that agent's related outstanding conditions into one assessment where useful. Lack of usable resources retains the wait and honest verification status, rather than fabricating a check or declaring success.

The timer wakes a short check and then releases safe capacity; it does not hold a provider/MCP call open through the delay. Observe existing agent/session/file ownership and serialize incompatible work. Waiting-task reservations remain intact. Neither a wake-up nor a paid assessment is permission to execute the blocked action or start a second unfinished task for that agent.

## Durable state and lifecycle

Persist the current condition/source revision, responsible owner, relevant evidence, previous attempt/check outcome, backoff progression and next opportunity with the domain's existing recoverable state. Secrets retain their protected storage boundary. Restart recovers this schedule without replaying old checks/messages/effects or resetting every delay. A long downtime produces at most one currently useful due check, not a catch-up burst of all missed intervals. Use robust elapsed-time handling and reconcile saved timestamps after clock changes.

**Pause is authoritative.** Automatic agent wake-ups and paid relevance checks do not run during `pausing`/`pause`, even if the agent has outstanding notices. Queue/coalesce relevant evidence until background scheduling is allowed again; do not use the explicit-chat exception to run an autonomous checker. Existing lightweight deterministic supervision, such as Health measuring recovery and removing its own reason, may continue under its domain contract. It does not run an agent or advance paused task work. Explicit user conversation and protected user input retain their ordinary lifecycle rules.

After Resume and removal of all other pause reasons, reconcile current evidence and perform at most the useful due check, preserving backoff for unchanged conditions. Stop starts no new checker and retains recoverable state for a later permitted start. Having no viewers or an absent/sleeping user does not justify short polling or reset the schedule; a sleeping/off host cannot check at all.

## Applications and boundaries

| Domain | Application |
| --- | --- |
| [Attention](../cli/notifications.md) and [human waits](../cli/user-interactions.md) | The responsible agent checks continuing need and withdraws obsolete requests, even while its task is waiting. This never re-pings an unchanged request. |
| [Task/core-agent retries](../cli/retries.md), [recovery](../cli/recovery.md) and [automatic repair](automatic-repair.md) | Schedule later cause-aware attempts after bounded immediate bursts. Preserve budgets and completed effects; a timer does not replenish unlimited paid attempts. |
| [Tools](../cli/tool-runtime.md), [browser](../cli/browser.md), [harnesses](../cli/harnesses.md) and [Wallet](../cli/wallet.md) | Recheck unavailable prerequisites and applicable authentication, respecting account, session and retry constraints. |
| [Git synchronization](../cli/git-synchronization.md) and persistence recovery | Back off failures through their existing coordinator, without replaying successful work or overriding ownership. The healthy synchronization cadence stays separate. |
| [Chatter briefs](../cli/project-report.md) and [engine updates](../cli/updates.md) | Schedule recovery from generation/persistence/update failures. Regular report/update cadence and explicit requests keep their own meaning. |

Do not stretch safety-critical Health sampling, UI animation/live transport, an explicit recurring task's schedule or normal successful periodic maintenance to a week merely because it also uses a timer. Their domain cadence remains authoritative; this policy governs uncertain waiting/recovery and attention revalidation. Manual Retry/Refresh retains its own authority, coalescing and lifecycle rules rather than silently resetting unrelated waits.

## Acceptance outcomes

- Keep a notice unanswered for minutes, hours and weeks: checks become progressively less frequent up to the suitable cap, the owner remains responsible, and no timed reminder or new attention is created.
- Supply relevant evidence before the timer, then generate many unrelated events: coalesce the useful check, verify the actual condition and retain the slower schedule for unchanged waits. Restart/reconnect does not create a fast polling burst.
- Require semantic invoice verification: allow a bounded attributed paid assessment during ordinary waiting, without consuming the blocked task's repair attempts, holding a provider call open or claiming another task for that agent.
- Pause before a due check and while one is active: obey the normal supported interruption boundary, launch no new automatic agent checks, accept explicit user input, and keep deterministic Health supervision available. Resume reconciles current state without catch-up inference.
- Exercise task/chat/core-agent, report, tool/browser/harness/Wallet, Git and update failures through this shared policy. Preserve domain budgets, known reset times, explicit deadlines, ownership and external-effect reconciliation.
