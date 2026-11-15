# Repair budgets, fallback and provider waiting

[Main specification](../_main.md) · [Unattended operation](autonomous-operation.md) · [Automatic repair](../concepts/automatic-repair.md)

Use the shared [progressive-waiting policy](../concepts/progressive-waiting.md) for uncertain recovery times across task/chat/core-agent, tool, Wallet, report and persistence retries. Domains retain their safe operation, immediate budget and known reset/deadline constraints; they do not implement independent fixed polling loops.

Distinguish check-feedback repairs, deterministic technical recovery and selection of an already authorized fallback tool. Defaults allow three implementation/repair attempts for a task and an initial technical attempt plus at most three technical retries. Explain extra calls and account for the combined budget; nested mechanisms must not multiply paid attempts invisibly.

On a named harness failure/quota limit, use the eligible [same-variant fallback chain](tools.md) in array order, respecting task/account/model constraints and paid authority. Do not wait through an exhausted first account's reset while an authorized appropriate fallback is available. Different variants can be selected for suitability under routing constraints. Ambient credentials or installed integrations never create an unapproved fallback.

## Technical failure and fallback selection

Same-variant fallback applies to an observed technical failure of a harness invocation as well as quota and authentication failures. After any applicable deterministic recovery, if that instance still cannot serve the dispatch, select the next eligible usable instance for the continuation before repeating the failed instance or handing the work to Fixer. Do not exhaust the technical retry budget against the same unavailable route while a suitable configured fallback is ready. Preserve the resolved endpoint, model/capabilities, explicit account constraints and spending authority; a different endpoint or unsupported model is not an interchangeable fallback merely because the variant matches.

Record the failure against the exact acquired connection/configuration, with its reason and bounded recheck opportunity. A late failure from an old credential/profile/endpoint must not mark its replacement unavailable. Re-evaluate current enabled configuration and readiness before the next selection; do not reuse the failed attempt's fixed route without checking alternatives. Once recovered, an earlier instance regains priority for later selections without moving an active fallback session. Account changes cannot transplant an incompatible native session; continue from the task's checkpoint and recorded effects through a supported session context.

Switching instances consumes the same applicable technical attempt budget; it does not reset the budget, multiply nested retries or replay completed effects. If no suitable fallback remains, use the existing bounded recovery/wait/Fixer path with the actual cause. A project-wide outage or exhausted alternatives must not produce an unbounded loop through accounts.

Cancellation, Pause/Stop, a human/Wallet wait and task-instruction changes are not harness failures and do not authorize a fallback continuation. A failed project check, unmet task outcome or individual failed tool observation in an otherwise successful turn follows its own repair policy; it does not by itself mark the harness/account unavailable. Apply failure classification at the actual terminal process/turn boundary described below.

## Recovery and waiting

Reuse valid authentication and supported safe refresh. Missing website login uses the continuing Wallet workflow, including an accessible-channel code or protected manual factor entry; only genuinely required human input uses its protected action. Harness-native authentication retains its own setup path. Do not repeatedly rerun login or blocked task execution merely because either wait exists; bounded attention-relevance assessment follows the separate policy below. If no candidate is usable, wait using reported reset/availability where known or bounded backoff; recheck without paid idle polling. Unknown quota is neither zero nor unlimited. A recovered earlier instance regains priority at later selection without interrupting already acquired work. New tools can resolve a wait without restart.

An unanswered durable User request is a human wait, not failed acceptance requiring another model attempt. Do not consume that task's budgets while unresolved; safe independent work may continue. The responsible agent still supervises its outstanding attention through progressive relevance checks, including bounded paid judgment where needed under [attention ownership](notifications.md); that check is not another execution/repair attempt or a repeated question. Detect unexpected hidden prompts and real stalled subprocesses rather than hang on unattended stdin. Lack of output during legitimate activity alone is not proof of stall.

Evaluate provider process/turn failure at its terminal boundary. Individual failed tool observations or echoed instructions do not automatically turn a completed turn into process failure. Actual terminal errors, nonzero exits, signals and unmet task outcomes remain distinct and cannot be stamped complete.

Commit/signing/disk/push failures do not rerun successful model work or effects. Resume the failed phase with ownership and evidence preserved. Remote synchronization retries have their own bounded coordinator/backoff and do not block otherwise safe local tasks/commits. Preserve normal pause/stop intent throughout.

Apply deterministic corrections first and hand unresolved/judgment-dependent problems to ordinary Fixer under the core automatic-repair principle. Its Book/TEAM governs consultation, not a new channel or unconditional user prompt. With no execution resources, retain the visible pending repair rather than claiming Fixer ran. The daemon stays controllable; finite commands can return an honest incomplete outcome. See [checks](checks.md), [harnesses](harnesses.md), [recovery](recovery.md) and [traces](traces.md).

The same cause-aware retry path applies to Router, Tasker and other core agents. Use known network recovery/quota reset information or bounded backoff, then send persistent/judgment-dependent failure as an ordinary Fixer repair task with available logs. Do not add separate retry/escalation machinery for each role or consume unbounded model calls on an unavailable provider.

## Cause-aware recovery beyond an immediate budget

Immediate attempt defaults bound a burst, not the lifetime of the agenda. Counter exhaustion alone must never produce a User question or abandon recoverable work. Classify the cause, checkpoint the failed phase and use an authorized alternative, ordinary Fixer or a scheduled recheck. Respect known recovery/quota times, connectivity changes and capped backoff with suitable spreading; do not hammer an outage or rejected credentials.

Persist reason, attempted remedies and next opportunity across restarts. Changed conditions/new tools can bring an attempt forward. Repeated equivalent failures without new evidence wait or change strategy instead of consuming paid idle inference. Task/chat/core-agent, Wallet, tool and Git retries share these principles with domain-safe operations, not independent escalation policies. Due retries still obey pause/stop.

Ask only for an actual missing substantive decision, input, authority or genuinely necessary human action; explain that need instead of offering a generic Retry question. Before repeating a state-changing request after uncertain response, reconcile [action records](action-log.md), local intent and actual service evidence. Prefer supported idempotency; never duplicate email/publication/submission because of a timeout, check failure or failed commit/push.

A retry/repair state is observable without automatically requesting operator attention. Apply the [minimal-interruption threshold](../concepts/minimal-interruption/decision-making.md) and escalate only an actual remaining human dependency. Neither core provenance nor system/content classification changes retry budgets, scheduling priority or effect-reconciliation obligations.

## Acceptance scenarios

- Two compatible enabled instances share a variant and resolved endpoint. The first returns a deterministic technical invocation failure; the next continuation uses the second, preserving the task's progress/effect records and combined budget. It does not repeatedly use the first until retry exhaustion, wait for a quota reset or invoke Fixer before considering the ready fallback.
- Repeat selection with an incompatible endpoint/model, explicit account restriction, disabled tool or unauthorized paid route: skip that candidate and retain the actual bounded wait/repair when no eligible fallback exists. Quota/authentication failures still use the same ordered eligibility rules.
- A delayed error from an acquired old connection cannot penalize a newly configured credential/profile/endpoint. Recovery of the earlier instance restores priority at a later selection, while already active fallback work keeps its own context.
- An interruption caused by Cancellation/Pause/Stop makes no fallback call for the interrupted work. Authorized chat/routing that remains available during task pause still follows its ordinary recovery rules. A failed project check or failed individual tool observation does not consume another account merely to evade the failure. A timeout after a possible external action requires reconciliation before any continuation repeats that action.
