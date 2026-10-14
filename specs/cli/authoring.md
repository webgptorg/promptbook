# Saving project and task changes

[Main specification](../_main.md) · [Automatic Git persistence](git-persistence.md)

`ptbk add` creates a task through its finite wizard or supplied description/stdin/template and priority inputs, without a model call or executing the task. Confirmation saves the task and commits the operation by default. Preserve readable descriptions, assign a stable reference when needed and leave the task unfinished. Report its reference/path and resulting commit, not merely that a file was written.

A successful default add must leave its new task source ready for the existing agenda, including automatic Manager assignment when routing is omitted. It must not routinely cause 'Manager cannot change or assign an uncommitted task source'. That protection remains valid for unrelated manual edits; the remedy is correct authoring persistence, not removing the ownership guard.

The same default applies when saving approved plan proposals, creating templates, editing task metadata, archiving/reviewing results, migrating, repairing project support or explicitly saving runtime settings to versioned configuration. Commit one logical operation with `PTBK: <summary>`. Temporary settings, viewing/answering runtime requests and other ignored-state-only changes need no Git commit. Read-only/dry-run paths remain read-only.

Validate destinations and preview freshness before writes. Coordinate with the running project's task/Git ownership: a save waiting for a safe boundary is visibly pending, not completed. Only release a newly authored source for dispatch after its authoring commit succeeds. Preserve other tasks, user edits and the index; do not commit another active task's work to make add succeed. Source or commit failure retains recoverable data, identifies the failed phase and never silently duplicates a task on retry.

Cancelling before confirmation changes nothing. `--no-commit` explicitly saves without committing, reports the resulting uncommitted paths and explains the consequences for ordinary start; it never pretends this opt-out is the clean ready-to-run workflow. Authoring approval authorizes only that operation's content, not arbitrary project writes or push.

Acceptance includes interactive and noninteractive add, several tasks saved as one approved batch, add during a running task, default Manager assignment afterwards, cancelled input, commit failure and intentional no-commit. All surfaces must agree on whether a save is pending, committed or explicitly uncommitted.
