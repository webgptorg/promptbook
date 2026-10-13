# Project checks and repairs

[Main specification](../_main.md)

Every task accepted by start must satisfy the project's configured checks and its requested outcome. Run checks on the content intended for the result commit, including changes made by formatters and other checks. A successful process exit is not sufficient evidence of task completion.

Checks are project-defined, not restricted to software builds. Missing or uninitialized validation is a setup problem, never an automatic pass. Preserve existing checks during initialization. Do not remove assertions, lower thresholds or disable validation merely to make a task pass.

Initialization and interactive start share a finite check configuration step. Init completes it before reporting ready, saving a real project default with available prerequisites so that a subsequent plain start needs no check-setup request. Validate commands, referenced npm scripts and dependency availability without running project checks; empty commands, unresolved references, recursive script graphs and generated setup placeholders remain unresolved. A non-software project can save a direct validation command in `ptbk.json.execution.check` without replacing its npm scripts.

Fresh sample projects include meaningful validation for their actual initial content. Neither an always-failing stub nor an unconditional successful exit qualifies. Existing projects retain their real validation; missing check dependencies or a deferred check make initialization incomplete. Configuration readiness does not mean tests have passed: the first runnable task must actually satisfy the configured checks before completion.

On failure, feed the actual check result into repair of the same active work, then recheck within the configured budget. Preserve attempts and diagnostics. If repair cannot proceed safely, keep the supervisor available with blocked work and an actionable request. Check-generated changes join the task's single result commit.

For finite run, `--check` selects a shell command and `--check-before` supports `no`, `yes-and-fail` and `yes-and-fix`. Optional checks that were not requested are visibly skipped, not passed. An enabled default software check uses `npm run check`; a non-software project can supply its own command.

`ptbk fix` checks and repairs only failing validation; it does not consume the ordinary queue. On a healthy unchanged project it needs no model and creates no repair task or empty commit. A check-only transformation is recorded as its own explicit maintenance task when there is no active task to own it.

See [execution](execution.md), [retries](retries.md) and [Git persistence](git-persistence.md).
