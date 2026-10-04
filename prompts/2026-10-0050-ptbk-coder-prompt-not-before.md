[ ]

[✨🗓️] Add composable not-before date and time annotations to Coder prompts

Allow an individual Markdown prompt to specify the earliest date/time at which it may start. A scheduled prompt remains pending until that boundary; the date is neither a deadline nor a guarantee that Coder will be running then. Preserve model/harness/Book-agent routing and priority annotations and make scheduling compose with them.

## Authoring contract

The examples below are separate status-line examples, not additional tasks in this PRD:

```markdown
[ ] `2026-10-30`
[ ] !! `2026-10-30 09:30`
[ ] `gpt` `2026-10-30T09:30:00+01:00`
[ ] `2026-10-30T08:30:00Z` `developer` !!
[ ] `gpt-4.1-2025-04-14` `2026-10-30`
```

-   Recognize a schedule only in an inline backtick-delimited token on the prompt's own controlling status line. Dates in prose, titles, filenames, the task body, links, code examples or completion reports must not accidentally become scheduling instructions.
-   Unbackticked explanatory text is not a scheduling/routing directive. Keep priority exclamation marks working without backticks, preserve the existing status grammar, and never execute an invalid/non-ready status line merely because a date-like word appears somewhere in it.
-   Support the explicit v0 grammar: `YYYY-MM-DD`; `YYYY-MM-DD HH:mm` with optional seconds and fractional seconds; and ISO-style `YYYY-MM-DDTHH:mm` with optional seconds/fraction, with no zone, `Z`, or an explicit `+HH:mm`/`-HH:mm` offset. Also accept an explicit offset on the space-separated date-time form. Document the accepted subset instead of claiming every possible ISO representation.
-   A date without a time becomes eligible at the start of that date, not the following day. The boundary is inclusive: `now >= notBefore`. Thus `2026-10-30` means not earlier than midnight starting October 30, 2026 in the resolved timezone.
-   An explicit offset or `Z` determines the instant. For dates/times without an offset, use one explicitly resolved local timezone for the invocation, matching any existing scheduling timezone policy when present, and display that interpretation. Pass timezone context into the shared parser; never depend on inconsistent host parsing of date-only versus date-time strings.
-   Reject invalid calendar dates, out-of-range clock/offset values and malformed date-shaped tokens with an actionable file/section/token diagnostic. A typo such as `2026-02-30` must block the affected prompt rather than make it run immediately or masquerade as a model restriction. Require an explicit offset for ambiguous/nonexistent local daylight-saving times rather than silently choosing a different time.
-   Accept repeated tokens resolving to the same instant as redundant; conflicting not-before instants are a configuration error for that section. Do not silently use whichever token happened to be parsed last.
-   Relative words such as tomorrow, natural-language conditions, recurring schedules and time-only values are not executable scheduling syntax in this PRD. Do not call a model or infer dates from prose.

## Keep dates and runner targeting distinct

-   At the inspected baseline, `extractPromptRunnerTokens` returns every backtick token and `isPromptCompatibleWithRunner` treats them as normalized substring alternatives. Introduce typed annotation classification before either routing or scheduling consumes those tokens.
-   Recognize a date/time only when the complete token conforms to the date grammar, or report a date-shaped invalid token as invalid. A dated model identifier such as `gpt-4.1-2025-04-14` is still a runner token; do not search for and extract its embedded date.
-   Remove valid scheduling tokens from runner matching. A date-only restriction must not require a matching model name. Conversely, a runner token must not be fed to permissive date parsing.
-   Preserve existing matching behavior for non-date runner tokens, including current any-of/substring semantics. Do not silently turn several existing runner tokens into an all-of condition as part of adding dates.
-   Eligibility requires BOTH the time restriction and the existing status/priority/runner restrictions to permit execution. A date token must never satisfy the runner's any-of condition or bypass an explicit agent/model constraint.
-   Support no annotations, date only, runner only, or both in either order alongside priority and prose. Preserve the original annotation text when updating task status or adding runner attribution.

## Architecture: separate concerns, not one larger parser

-   Split responsibilities into focused modules: status-line token extraction with source locations; annotation classification; strict date/time parsing and normalization; runner-target parsing/matching; and task eligibility evaluation. Keep filesystem loading, CLI display, waiting and execution outside these pure parsing functions.
-   Define a typed normalized annotation result with separate runner constraints and scheduling data, plus explicit diagnostics. One token must have one classified meaning; do not let two downstream consumers independently guess what it meant.
-   Centralize the supported date grammar and timezone conversion. Do not scatter regular expressions or `Date.parse` calls across list, queue, server and UI code, and do not grow `parsePromptFile` or `isPromptCompatibleWithRunner` into a large function handling every concern.
-   Inject the clock and timezone context into eligibility evaluation. Parsing must not mutate files, access the network, sleep, install a harness or depend on a globally captured current time. Keep cached syntax separate from time-sensitive readiness.
-   Expose the same normalized not-before restriction to the following [task Book migration](2026-10-0060-ptbk-coder-task-books-and-migration.md) and [recurring task](2026-10-0070-ptbk-coder-recurring-task-books.md) work. New formats must call this temporal logic instead of reimplementing it.
-   Use narrow interfaces and typed results that leave room for future trigger kinds without implementing natural-language/event evaluation now. Extensibility is not a reason to introduce an unnecessary generic plugin framework.

## Queue and user experience

-   Apply the shared eligibility decision at every real task-selection/claim boundary and in listing, dry-run, upcoming-task views and server queue snapshots. A cached queue must not start a task early or keep it blocked after its date arrives.
-   Reevaluate after repository synchronization and source edits. A future high-priority task must not prevent another eligible task from running. Do not mark a deferred task done, failed or not-ready just because time has not arrived.
-   A finite `coder run` processes currently eligible work and exits when none is runnable, explaining that future tasks remain and showing the next relevant not-before time. It must not silently become a daemon or report all tasks completed.
-   An existing persistent/server execution loop rechecks deferred tasks at an appropriate future wake-up or source change, without restart, busy polling or paid model calls while idle. Reuse its existing lifecycle; implementing the planned unified workspace server is not a prerequisite.
-   Do not treat this restriction as the existing skippable pacing wait. The `S` skip-wait key, pause/resume and ordinary retry controls must not override a task's not-before boundary.
-   Scheduling gates the start of new work. Preserve explicit recovery of a genuinely already-started interrupted task, and identify that as recovery rather than using its in-progress status to launch an unrelated future task.
-   Listing/help/dry-run remain side-effect free and display the interpreted instant/timezone and deferral reason without rewriting the source.

## Acceptance criteria

-   With a fake clock, the task cannot start one millisecond before its boundary and becomes eligible exactly at it. Test date-only, space-separated and ISO date-times, explicit offsets, leap days and timezone/daylight-saving validation.
-   Table-driven tests cover date only, runner only, both orders, priority combinations, multiple runner alternatives, repeated identical dates, conflicting dates and an explicitly dated model name. Existing runner matching has unchanged results when no scheduling annotation is present.
-   Dates outside the control-line backticks do not schedule work. Invalid date-shaped directives produce visible blocking diagnostics rather than silently becoming an unrestricted prompt.
-   Multiple sections retain their own independent restrictions. Status/attribution updates preserve scheduling metadata and do not parse historical completion timestamps as new directives.
-   Queue/list/dry-run/server views agree about ready versus deferred tasks. A blocked high-priority future task does not starve ready work, and skip-wait cannot execute it early.
-   A finite run exits honestly with future work remaining; an already running persistent scheduler picks the task up after advancing a fake clock or editing the source. No real waiting, external services or paid harness calls are needed for tests.

## Context and documentation

-   Inspect [Markdown parsing](../scripts/run-codex-prompts/prompts/parsePromptFile.ts), [runner token matching](../scripts/run-codex-prompts/prompts/isPromptCompatibleWithRunner.ts), [next-task selection](../scripts/run-codex-prompts/prompts/findNextTodoPrompt.ts), [queue orchestration](../scripts/run-codex-prompts/main/runCodexPrompts.ts), and [status updates](../scripts/run-codex-prompts/prompts/resolvePromptStatusLine.ts).
-   Keep the implementation DRY, with small single-purpose modules. Update [Coder workflow documentation](../scripts/run-codex-prompts/README.md), generated prompt instructions, CLI help and relevant [Coder website](../apps/coder-landing) examples. Add implemented changes to the [changelog](../changelog/_current-preversion.md).
