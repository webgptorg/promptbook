# Durable audit of external actions

[Main specification](../_main.md) · [Storage and Git](storage-and-git.md) · [Recovery](recovery.md) · [Action log page](action-log-ui.md)

## Meaning and storage

An external action changes state outside the repository: sending email or a data-box message, submitting an accounting document, publishing a post, or creating/updating/deleting a remote document or record. Classify by actual effect, never just HTTP method. Reading/searching pages and ordinary file downloads are not actions; local source edits have Git and local Wallet mutations have their separate audit. Record meaningful operations, not every click, request or retry.

Store records under root **`actions/<task-file-basename>/`**, using exactly the same literal source-filename mapping, collision, rename and provenance rules as [traces](traces.md#literal-source-filename-mapping). **One Markdown file represents one logical external action**; a task may have any number. Use readable collision-safe filenames inside the directory. Reconciliation/retries of the same action update its record, not create a duplicate. Recurring occurrences retain separate attribution under the same source directory. No external actions means no task action directory. Capture prospectively for new tasks; do not backfill historical tasks or invent old actions from traces.

Each record explains when, which agent/task/occurrence and actual source/revision, operation, service/account/target, what was sent or changed, observed outcome and available external reference/receipt. Include readable content or a durable project-relative reference sufficient to understand the effect. Distinguish confirmed, partial and uncertain effects; never infer success from a timeout or task completion. Redact passwords, keys, factors, tokens and secret URL parameters before storage. Permitted message/document content can still be private and follows the repository's visibility choice.

These are audit data, not a new Book entity or executable instructions. Exclude `actions/` from Book discovery/execution even when records quote Book syntax.

## Durable capture and Git

Save known effects promptly, including when later work/checks/result persistence fails. Records **are versioned independently of trace/video settings** and do not wait solely for successful task completion. Use a scoped action audit commit or a compatible already-due owning-operation commit with Task-Name/provenance; never absorb unrelated unfinished work. No commit is needed for each browser click. An explicit no-commit workflow retains saved records and visibly pending persistence under the existing contract; there is no new action-audit disable switch.

A failed Git operation retries persistence, not the completed remote operation. An empty commit cannot replace a newly captured action's Markdown record. Successful action-audit commits are not extra successful task-result commits.

## Reconcile before retry

Before a consequential request, preserve local recovery intent identifying the logical operation. After loss of acknowledgement, inspect the actual service outcome, receipts, action records and local recovery evidence. A timeout is not proof of failure. Use available idempotency or verified reconciliation to avoid repeating completed sends/submissions/publications. Known failed attempts without a mutation belong in traces/runtime diagnostics, not fabricated action records.

Do not repeat a confirmed effect because checks, commit, push, task retry or source revert removed a completion marker. Investigate uncertain effects through ordinary autonomous repair and block only the affected unsafe step. Git revert cannot undo a remote action, and known-effect evidence must survive a reverted versioned record. This is not a distributed transaction with every service; preserve uncertainty without a routine human Retry question.

## Acceptance outcomes

Run a no-action task and one with several emails, a data-box submission, a Google document edit and a post. Verify zero/multiple Markdown files, exact basename mapping, attribution/content/outcomes and no read/download entries. Disable traces and fail a later check: performed actions remain saved and scoped-committed. No historical backfill occurs.

Disconnect after sending before acknowledgement, restart/retry and fail Git persistence: reconcile without duplicate effects/records. Preserve uncertainty, independent work, secrets exclusion and source/rename/revert provenance.

## Autonomous supporting effects

The same external-effect audit applies to supporting/system work and engine-owned operations. An authorized helper-app publication or provider-side infrastructure resize must be recorded even though the project Git diff cannot reconstruct it. Preserve actual operation/executor attribution; use an honest system-operation association where no source-backed task exists, rather than inventing a Book or source filename. The audit is required independently of optional traces and notification policy. See [minimal interruption](../concepts/minimal-interruption/decision-making.md).
