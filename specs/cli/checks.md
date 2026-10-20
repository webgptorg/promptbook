# Project checks, placeholders and repairs

[Main specification](../_main.md) · [Initialization](initialization.md) · [Automatic repair](../concepts/automatic-repair.md)

A task's requested outcome must be satisfied independently of its check command's exit status. Run configured real checks against the content intended for the result commit, including formatter/check-generated changes. A successful process or informational placeholder is not sufficient evidence of task completion.

## Initialization without a validation question

Do not ask users to configure checking commands during init or make a check-setup wizard a prerequisite of plain start. Preserve real existing validation. When absent on initialization, save a harmless successful placeholder such as:

```sh
echo "Configure project checks in ptbk.json execution.check"
```

The placeholder explicitly means **real automated project validation is not configured**. Show that state honestly instead of claiming tests passed. It does not block init, bootstrap or ordinary work. It must not be an always-failing stub or an invisible unconditional pass presented as meaningful validation. An explicit supplied check can still configure the project; no interactive decision is required.

Expert's ordinary bootstrap or later authorized work may replace the placeholder with appropriate validation for the actual project. Checks can validate non-software projects too. Do not require a meaningless software build or invent a second onboarding gate. Existing invalid/failing real checks are genuine repair problems; never downgrade them to the placeholder, remove assertions, lower thresholds or disable validation merely to pass a task.

## Execution and repair

For an actual configured check, inspect command references/dependencies and retain the real result. A broken command is not silently treated as the informational placeholder. Feed failure into repair of the same active work and recheck within budget; use the normal Fixer/problem path when needed. Preserve attempts and diagnostics. Block only unsafe or unresolved affected work while the supervisor remains available. Check-generated edits join the task's result commit.

For finite run, `--check` selects a command and `--check-before` accepts the documented CLI modes `no`, `yes-and-fail` and `yes-and-fix`; their stored enum values are canonical uppercase. An explicitly enabled software check can use `npm run check`; a non-software project may specify a direct command. Unrequested/skipped validation and the placeholder are labelled, never reported as real checks passed.

`ptbk fix` addresses failing validation without consuming the ordinary queue. A healthy unchanged project requires no model, repair task or empty commit. A placeholder alone is not a failed check that should cause endless repair. A check-only transformation with no owning task is recorded as its own ordinary maintenance operation.

See [execution](execution.md), [retries](retries.md), [first task](first-task.md) and [Git persistence](git-persistence.md).
