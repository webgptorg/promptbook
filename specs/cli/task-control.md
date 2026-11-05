# Directing existing work through chat

[Chatter](../agents/core-agents/chatter.md) · [Chats and tasks](chat-tasks.md) · [Task Books](task-books.md) · [Sessions](harness-sessions.md) · [Book layering](../book-language/layering.md) · [User control](../concepts/user-control.md)

## Responsibility flows from the user

The user is the project owner/manager and need not know how many tasks, agents or harness sessions are running. Chatter is the project assistant responsible for arranging the requested outcome: inspect relevant state, identify the responsible agent(s), invite/delegate as needed, follow up and report the actual result. Agents may delegate through further hierarchy within project authority. Harness sessions are their technical tools, not entities the user must manually manage.

This is broad contextual work management, not a fixed menu of task mutations. A request may inspect status, amend instructions, change a destination, accept a partial result, cancel remaining work, stop future recurrence, ask for notification at completion, or combine these. A status query or notification subscription need not mutate a task or create another task. Persist a notification request and deliver its actual outcome once after recovery; do not keep a model/MCP call open while waiting.

For example, “this article is enough, accept it” can complete against the revised goal after validation; “stop, I no longer want it” cancels unfinished work without calling the original goal fulfilled. “Tell me when it is done” leaves the work intact. Interpret “enough” from context rather than mapping it to one status. Ask only if a material ambiguity remains after inspecting available context.

The responsible specialist retains ownership, speaks under its own name when joining the chat and arranges the appropriate session control. Chatter follows the handoff through to a confirmed or honestly pending/failed outcome. Neither hierarchy nor the word “omnipotent” grants access outside existing authority, overrides a user's rules or bypasses ownership, checks, lifecycle or billing restrictions.

## Preserve intent and the same work

Record the original accepted user message, source chat/turn, affected task/occurrence/session(s), interpreted instruction, scope and responsible agent. A forwarded real user instruction retains its verifiable origin and authority through delegation; advice from an agent remains advice. A quote or unverified claim that “the user wants” cannot promote untrusted text into authority. Source chat references may be appended to the Book; TASK ORIGIN remains the original creation provenance, not a field overwritten by every later conversation.

Amending or continuing the same kind/purpose of work uses the original task, even after successful completion. Append [TASK REOPEN](../book-language/commitments/task-reopen.md) when further execution is required; preserve prior DONE/result commits. Fundamentally new work gets a new task with an appropriate relationship/link to the original. Do not decide identity by a word-count threshold. A reopened task waits if its agent owns another unfinished started task; it cannot displace that reservation. Independent new heavy work still goes through ordinary task scheduling.

## Append changes, then reconcile execution

Append a chronological [TASK CHANGE](../book-language/commitments/task-change.md) containing the amendment and scope. Preserve the old instructions, status/schedule events, result evidence and optional source-chat link in the Book. Derive current instructions by applying valid amendments in source order; a later amendment overrides only its stated conflict, retaining unrelated rules. Structural scheduling/routing changes additionally append their typed commitments under the same revision. TASK NOTE is explanation and cannot be mistaken for an executable amendment.

Distinguish `task` (definition and relevant current/future work), `occurrence` (one selected run only) and `future` (subsequent occurrences only). Record the actual target occurrence; timestamps alone are not unique identifiers. “This time” does not change every future run. If only future recurrence is retired, a current occurrence continues only where the request allows it. “Send no further report” also prevents a pending send in the current occurrence; already performed external effects remain historical.

If no session is running, its next start receives the latest applicable instructions. If one or more affected sessions are running, the engine through the responsible agent **must reconcile/deliver the change** to all relevant execution contexts. Saving the Book alone is insufficient. Persist per-change, per-session receipts with source revision/order and distinguish:

| State | Evidence |
| --- | --- |
| Saved | The change is durably in the Book; Git may separately be pending. |
| Delivered | The target adapter/session has accepted this exact control input. |
| Applied | Processing acknowledgement or observable execution evidence establishes that the worker has incorporated it. |

Queued, deferred, rejected, failed and uncertain outcomes remain explicit with the reason and next action. Do not report Applied from a write, socket send or an unrelated model answer. A session resumed/replaced after delivery receives the applicable revision and receipt history. No task may be reported completed against obsolete instructions while a newer applicable change remains unresolved; revalidate affected results/checks before the next result commit. Delivery reconciliation uses the existing revision/ownership boundary so a late completion cannot race past an accepted amendment.

Use supported live steering, supported interruption followed by continuation, or delivery at the next supported opportunity. Preserve context and prior effects; do not spawn a competing executor just to deliver a change. Under exclusive human takeover, queue automatic input until control returns, while making the pending amendment visible. Under engine Pause, save changes and permit supported interrupt/cancel control, but defer inputs that would resume/advance task execution until Resume. A conversation cannot smuggle task work through the chat exception.

Reconcile receipts after restart without blindly replaying accepted inputs or uncertain external effects. Preserve all amendments even when coalescing obsolete pending inputs; never replay superseded instructions or silently lose an ordered change. If immediate stopping/steering is unsupported, explain the actual in-flight risk and boundary instead of asserting that a pending external action has been prevented. Intent is never proof of an already completed cancellation.

## Cancellation, recurrence and outputs

Use [TASK STATUS](../book-language/commitments/task-status.md) `cancelled` for ending unfinished one-off work without successful completion; `retired` disables future recurrence without deleting its definition. Completion, cancellation, retirement and reopening remain separate historical events. For a one-off task, DONE or cancellation closes its current work cycle; a later `todo` cannot erase that terminal event without REOPEN. Failed-work retry follows ordinary recovery and is not by itself a new task or successful completion. A new valid status supersedes the prior status without erasing it; reactivating completed/cancelled one-off work additionally needs REOPEN. A failed/cancelled result does not satisfy a successful dependency.

Cancelling work or future repetition preserves its Book, prior results and evidence. Physical deletion requires an explicit deletion request. Interruption/cancellation does not automatically revert files or remote actions. A requested rollback is separate work limited to attributable changes and real reversible effects, preserving concurrent/user edits and recording uncertainty. An accepted partial result is checked against the changed goal; prior output is not destroyed merely because work was stopped.

These are contextual operations through chat/shared engine control, not new per-agent/task/session Pause and Stop dashboard buttons. The lifecycle controls in this scope apply to the whole engine; explicit session takeover is separate.

## Acceptance outcomes

Through Chatter manage ten agents/tasks without requiring the user to select IDs: query state, amend the correct work, delegate through a specialist, accept partial work, cancel and subscribe to completion. Preserve original user authority versus agent advice. Apply amendments to multiple sessions and distinguish Saved/Delivered/Applied during live input, interruption, unavailable adapter, exclusive takeover, engine pause and restart. A newer amendment prevents stale completion. Resume with the current revision and no duplicate external effect.

Reopen the same completed task without deleting its prior DONE; queue behind another task owned by that agent. New fundamental work gets a linked new task. Retire only future recurrence versus prevent the current pending send, keeping the Book/history and reporting any already-performed/uncertain effect. Notification-only requests do not mutate work; cancellation is not false success or automatic rollback.
