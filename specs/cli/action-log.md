# External activity log: durable records

[Main specification](../_main.md) · [Impact](../concepts/external-action-impact.md) · [Storage and Git](storage-and-git.md) · [Recovery](recovery.md) · [External activity log page](action-log-ui.md)

## Meaning and storage

An external action changes or meaningfully attempts to change state outside the project's own repository: sending email/data-box messages, attempting a payment, submitting accounting documents, publishing or editing remote documents/records. Classify by actual or possible effect, never just HTTP method or tool name. A rejected payment belongs here with an explicit failed outcome; it must not suggest that money moved. Record logical operations, not every click, request or retry.

Pure reading/searching and ordinary downloads without another effect are excluded. Reading Wikipedia is not an entry. Opening an email that marks it read is an entry, normally with impact 0, even when hidden by the default view. Login, including data-box login, qualifies when it changes session/service state or can trigger a meaningful external consequence; explain the actual effect rather than assigning every login a fixed score. Login and its consent/verification steps form one logical operation with technical steps in its detail.

Internal project edits, planning, agent communication, engine operation, local Wallet maintenance and the engine's own project Git synchronization are outside this log. Their evidence remains in Git, task details, harness sessions, System diagnostics or protected storage. An explicit task publishing to an external service differs from the engine synchronizing its own project. Supporting/system purpose never exempts an actual external operation.

Store records under root **`actions/<task-file-basename>/`**, using the literal source-filename mapping, collision, rename and provenance rules of [traces](traces.md#literal-source-filename-mapping). **One Markdown file represents one logical external action**, including a meaningful failed attempt. Use readable collision-safe filenames. Reconciliation/retries update that record; recurring occurrences retain separate attribution under the source directory. No qualifying actions means no task action directory. Capture prospectively; never invent or silently backfill old actions from traces.

Each record retains a stable logical-action identity (audit metadata, not another Book/entity ID), time, actual agent/task/occurrence/source revision, operation/service/account/target, attempted/sent/changed content and available safe evidence/receipt. Include readable content or a durable project-relative reference. Retain attempt times and outcome changes. Distinguish success, failed, pending, partial and uncertain outcomes; a task's result or a timeout proves neither action success nor failure. Redact passwords, keys, factors, tokens and secret URL parameters. Permitted content still follows the repository's visibility choice.

Retain a numeric **impact or explicitly unknown**, contextual rationale and [methodology provenance](../concepts/common-knowledge.md#evaluation-provenance). Impact describes the consequence **if successful**, independently of outcome. The executing agent estimates it from inherited knowledge; the engine computes aggregation/filtering/ranking. Failed/successful variants of the same action at equal age therefore rank equally.

These are audit data, not a new Book entity or executable instructions. Exclude `actions/` from Book discovery/execution even when records quote Book syntax.

## Durable capture and Git

Save meaningful attempts and known effects promptly, including when later work/checks/result persistence fails. Records **are versioned independently of trace/video settings** and do not wait solely for successful task completion. Use a scoped action audit commit or compatible already-due owning-operation commit with Task-Name/provenance; never absorb unrelated unfinished work. No commit is needed per browser click. An explicit no-commit workflow retains saved records and visibly pending persistence; there is no new action-audit disable switch.

A failed Git operation retries persistence, not the completed remote operation. An empty commit cannot replace a newly captured action's Markdown record. Successful action-audit commits are not extra successful task-result commits.

## Reconcile before retry

Before a consequential request, preserve local recovery intent identifying the logical operation. After lost acknowledgement, inspect service outcome, receipts, records and recovery evidence. A timeout is not proof of failure. Use idempotency/verified reconciliation to avoid duplicate effects. A meaningful rejected send/payment/submission remains an action; low-level setup failures without such an attempted operation stay in traces/diagnostics.

Three rejected attempts followed by success of the **same intended payment** are one logical action, ultimately successful, with all attempts retained in its detail/task history. Technical retries, including audit-persistence retries, never increase impact. Two actually executed payments are two actions, even if identical or the second accidental. If a retry causes a second real effect, preserve both and their relationship; never deduplicate away the mistake. Distinct intended operations do not merge merely because content matches.

Do not repeat a confirmed effect because checks, commit, push, task retry or source revert removed a completion marker. Investigate uncertain effects through ordinary autonomous repair and block only the affected unsafe step. Git revert cannot undo a remote action, and known-effect evidence must survive a reverted versioned record. This is not a distributed transaction with every service; preserve uncertainty without a routine human Retry question.

## Acceptance outcomes

Run a no-action task and tasks with emails, a data-box submission, document edit, post, rejected payment and read-state change. Verify exact basename mapping, content/attribution/outcomes and exclusion of pure reads/downloads, internal work and project autosync. Explain login boundaries. With traces off and a later failed check, actions remain saved/scoped-persisted. No historical backfill occurs.

Disconnect after sending before acknowledgement, restart/retry and fail Git persistence: reconcile without duplicate effects/records. Verify several failed attempts then success as one logical record, and two real effects as two. Preserve uncertainty, independent work, redaction and source/rename/revert provenance.

## Autonomous supporting effects

The same external-effect audit applies to supporting/system work and engine-owned operations. An authorized helper-app publication or provider-side infrastructure resize must be recorded even though the project Git diff cannot reconstruct it. Preserve actual operation/executor attribution; use an honest system-operation association where no source-backed task exists, rather than inventing a Book or source filename. The audit is required independently of optional traces and notification policy. See [minimal interruption](../concepts/minimal-interruption/decision-making.md).

## Inherent bulk-operation groups

One bulk operation implemented as many actual actions carries a shared **group ID** assigned by the executing agent. Sending 1,000 campaign emails through 1,000 Send clicks produces 1,000 individual logical records with one group ID. Preserve every action's attribution/content/outcome. Do not infer a batch merely from identical operation type or replace source records with a summary.

Membership is durable metadata; viewer grouping/ungrouping never changes it. Each action belongs to at most one inherent batch. Batches contain actions only, never other batches. Task/agent grouping adds derived navigation levels, not nested batch records. Aggregate impact with the [shared weight formula](../concepts/external-action-impact.md). A batch differs from retry collapse: it contains many real actions; retries belong to one.

## Derived views and cache

Individual actions, attempts, impact/provenance and explicit group membership are authoritative. Batch/task/agent summaries, aggregate impact/priority and navigation indexes are derived. Cache them in ignored `.ptbk/` with bounded reads and revision-aware invalidation for changed source/membership/attribution. Deletion permits rebuilding without remote/model calls, fabricated records or rescoring source actions. Keep durable recovery intent, methodology evidence and core-template baselines distinct from rebuildable cache.

Capture 1,000 grouped emails and verify source records survive all four [views](action-log-ui.md), with no double counting. Rebuild caches and obtain identical totals and complete member details.
