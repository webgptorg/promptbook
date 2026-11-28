[ ]

[✨🔁] Add simple recurring task Books on a trigger architecture extensible to future conditions

After [task Books and migration](2026-10-0060-ptbk-coder-task-books-and-migration.md), add recurring tasks only to the Book-task source selected by `--tasks` (default `tasks/`). A task can become due repeatedly, for example to review accounting every week or periodically refresh the repository's model catalog. Version zero implements deterministic time and interval triggers only.

-   Reuse the [not-before contract](2026-10-0050-ptbk-coder-prompt-not-before.md), shared normalized task model, queue, claim/execution/check/Git services and task-source configuration.
-   Keep Markdown prompts one-shot. This requirement supersedes the unfinished [older recurring-prompts proposal](2026-09-0300-ptbk-coder-recurring-prompts.md): do not implement a separate `prompts/recurring` scheduler or invent recurring Markdown annotations.
-   Do not implement natural-language interpretation, external event monitoring, tax-calendar rules or a new autonomous server in this version. The example activities are task payloads, not built-in product integrations.

## Book syntax and examples

Extend the task dialect with `REPEAT`; keep `AFTER` as its first possible execution time. This is a proposed executable v0 example, using the task syntax from the prerequisite:

```book
Review and update the model catalog weekly

TASK
META ID weekly-model-catalog-review
STATUS todo
PRIORITY 1
AGENT {../agents/coding/developer.book}
HARNESS openai-codex
AFTER 2026-10-30T09:00:00+01:00
REPEAT every 1 week

PROMPT
Check the model providers' official sources for relevant catalog changes.
Update this repository's model metadata and documentation when necessary.
Record which sources were checked and do not invent unavailable models.

RULE
Preserve custom configuration and run the project's configured checks.
```

The equivalent interval spellings below are alternatives, not several independent schedules:

```book
REPEAT 1w
REPEAT 7d
REPEAT every 7 days
REPEAT P1W
REPEAT P7D
REPEAT PT168H
```

A separate example for a project that has its own Accountant agent:

```book
Weekly accounting review

TASK
META ID weekly-accounting-review
STATUS todo
AGENT {../agents/accountant.book}
AFTER 2026-11-02 09:00
REPEAT 1w

PROMPT
Review the accounting records available in this workspace.
List missing documents, unmatched transactions and items needing human review.
Do not submit returns, transfer money or contact third parties.
```

-   The accounting example is illustrative; do not create an Accountant agent or connect external accounts automatically. Existing project execution/harness configuration still applies.
-   Support positive whole-number durations with explicit seconds/minutes/hours/days/weeks units: compact forms such as `30m`, `24h`, `7d`, `1w`; a bounded readable grammar such as `every 2 weeks`; and the corresponding fixed-duration ISO forms, including `PT30M`, `P7D` and `P1W`. Normalize them through one strict duration module, reusing an existing suitable duration utility where possible.
-   Define v0 intervals as elapsed durations: one day is 24 hours and one week is seven such days. Do not imply that a fixed interval preserves the same wall-clock hour over a daylight-saving transition. Calendar months/years, cron expressions and arbitrary prose are outside this grammar and must produce useful unsupported-expression diagnostics.
-   Reject zero, negative, overflowing, ambiguous or malformed intervals; do not silently coerce them to immediate execution or an unrelated unit. Repeated equivalent `REPEAT` values are redundant; contradictory values are invalid.
-   Preserve the original authored expression as well as its typed normalized value for diagnostics and future syntax evolution. `AFTER`, `REPEAT`, agent/model fields, priority and task-local instructions have independent meanings.

## One-shot and recurring time semantics

-   Without `REPEAT`, a task retains exactly the one-shot behavior established by the prerequisite. Adding a not-before time alone must not make it recur.
-   With `AFTER` and `REPEAT`, the explicit not-before instant is the schedule anchor and first due instant. Later slots are `anchor + n * interval`, not the previous completion time plus the interval. A slow run must not silently shift the whole schedule.
-   With `REPEAT` but no `AFTER`, make the first occurrence immediately eligible when the definition is first activated. Persist that activation anchor once under mutation ownership; do not reset it on parsing, listing, restart, source rename or every queue refresh. Read-only preview reports that no anchor has been persisted yet.
-   A due time is a lower bound on claiming work, not a hard real-time promise. Runner availability, priority, repository safety, pause state and other existing constraints still apply. A task that is not due must never run just because it has high priority or the user skips a pacing wait.
-   Use the prerequisite's strict timezone/offset resolution for the first anchor. Compare instants internally and display the interpreted timezone. Fixed-interval calculations must remain stable across timezone changes after activation.
-   Derive a stable occurrence identity from task identity, schedule revision and the due slot. Evaluate the current time freshly at claim time; do not create a separate OS cron job or timer process for each source file.

## Definition, occurrence and durable state

-   Separate the reusable task definition from individual execution occurrences. A successful occurrence is done; the recurring definition is still active and can be due again. Never permanently mark the definition completed or archive it after its first successful run.
-   Keep the active recurring definition's authored `STATUS todo`; show per-occurrence running, completed, failed and interrupted state in the shared runtime/result view. `STATUS not-ready` pauses new occurrences, and an explicit `STATUS done` retires the definition. An inactive definition must not be reactivated by the scheduler.
-   Persist the anchor, normalized schedule revision, last consumed/completed slot, next due instant, current claim and bounded occurrence history using project-local durable state keyed by stable task ID. Include due/start/end times, outcome, retries and links to available traces/commits.
-   Reuse existing suitable persistence/claim services. A lightweight store beneath `.promptbook` is acceptable for standalone Coder; requiring the planned full SQLite workspace server merely to run a recurring Book is not. Keep persistence behind an interface shared with server execution.
-   Exclude operational state, lock files and temporary logs through narrowly scoped ignore rules so polling or updating a due time does not dirty the tracked working tree. Keep task definitions versioned and preserve the existing policy for deliberately durable execution artifacts. Do not blanket-ignore versioned project configuration.
-   A filename/title/directory change preserving `META ID` preserves the schedule/history. Duplicate IDs, malformed state or conflicting schedule definitions must be diagnosed rather than reset silently. Project workspaces remain isolated.
-   Treat schedule edits as a new revision with an explicit recalculated anchor/next slot. Re-read under ownership before claiming; never reuse a stale timer after `AFTER` or `REPEAT` changes. Record the transition and show the recalculated next due time. An in-flight occurrence retains its recorded definition snapshot.

## Downtime, concurrency and failures

-   Coalesce missed intervals: when several unprocessed slots are already overdue, execute at most one catch-up occurrence representing the latest due slot, recording that earlier slots were coalesced. Do not replay months of missed work immediately or create an unbounded queue of occurrence files.
-   Do not overlap occurrences of the same task. A long-running occurrence prevents another claim for that task; after it finishes, use the same coalescing policy to calculate the next work without a tight rerun loop.
-   Use the shared atomic claim/lease and workspace Git mutation coordination so a finite invocation and a server, or two workers in the same workspace, cannot run the same occurrence simultaneously. Scheduling must not bypass existing isolation or dirty-tree rules.
-   Persist a claim before execution and reconcile it with recorded outcome/artifacts/commits after interruption. A restart must not blindly replay a successfully completed occurrence whose final state update was interrupted. Ambiguous side effects require visible recovery, not a promise of universal exactly-once execution.
-   Keep retries within the same occurrence identity and the existing bounded retry/backoff policy. A retry is not a new scheduled slot, and checks or a push failure must not cause duplicate model calls or repeated business side effects.
-   For v0, an occurrence that exhausts repair/execution retries or has an ambiguous interrupted outcome blocks further automatic occurrences of that definition until explicit recovery/retry or acknowledgement through the existing task-control path. Show the reason clearly. Do not hide repeated failures behind continually scheduling new occurrences.
-   Distinguish completed implementation with pending Git synchronization from failed implementation. Preserve successful local commits without rerunning the task solely because pushing failed. Finalize task-owned/check-produced changes through the shared persistence policy.
-   Version zero coordinates a single shared workspace, not independently cloned repositories on different machines. Document that cross-clone/distributed exactly-once execution is not provided; never use a local state file as evidence of a global guarantee.

## Execution modes and visibility

-   A finite `coder run` executes due work through the ordinary queue and remains finite: claim at most one occurrence of each recurring definition per invocation, then exit once no other eligible work remains. Future recurrence must not turn a finite command into an endless daemon, even for a short interval.
-   The existing persistent/server mode stays available, wakes for the next relevant due time or source change, and continues through the same task-selection service. Reuse bounded/cancellable waits, pause/resume, safe shutdown and source watching rather than adding another scheduling loop beside the existing one.
-   Avoid paid model calls, repeated source writes and busy polling while waiting. Very distant due times must use bounded wake-ups that tolerate timer limits and clock changes without running early.
-   Show recurring versus one-shot identity, interval, next due time, latest outcome and any blocked/paused state in list/dry-run and existing terminal/server task views. Do not say all tasks are finished when active recurring definitions remain.
-   Respect the resolved `--tasks` override everywhere, including persistence source references, source reload and isolated execution. The recurrence service must not rediscover only a hardcoded `tasks/` directory.

## Architecture for future conditions, without implementing them

-   Represent scheduling as a typed trigger specification with a separate evaluation result, not only a `Date` field plus ad hoc recurrence booleans throughout the runner. Time/interval is the only supported evaluator in v0; keep raw expression, parsed semantics and evaluation outcome separate.
-   Keep Book parsing, temporal normalization, trigger evaluation, occurrence planning, claim/state persistence and task execution in focused modules with narrow interfaces. The evaluator receives clock/context and recorded state; it does not run Git, parse Books, call a harness or write source files.
-   The shared eligibility API should be able to explain ready, waiting-until, blocked/invalid and unsupported states and optionally supply a next wake-up time. Queue ordering remains separate from trigger evaluation.
-   Leave an explicit extension boundary for later condition/event evaluators, such as "after OpenAI holds a conference" or "whenever a VAT return becomes due", and naturally worded periods. These examples are design context, not executable v0 syntax, calendar facts or instructions to add external integrations now.
-   Future condition evaluators should be able to emit identified occurrences into the same claim/execution pipeline without rewriting the source adapters or runner. Do not implement those evaluators, NLP inference or speculative business rules in this PRD.
-   Unknown/future trigger expressions must be retained and reported as unsupported/blocked, never treated as an omitted restriction or interpreted permissively as immediate work. A future extension must not change the meaning of existing deterministic interval expressions silently.

## Acceptance criteria

-   Fake-clock tests cover one-shot versus recurring behavior, `AFTER` plus interval, first activation without `AFTER`, exact inclusive boundaries, equivalent interval formats and rejection of malformed/unsupported values.
-   A weekly task succeeds, retains its active definition, does not run again in the same slot, and becomes eligible at the next slot. A long run does not move the anchor; restart and file rename preserve identity/history.
-   An offline-for-several-weeks fixture produces one coalesced occurrence, not a catch-up storm. Competing workers cannot own the same occurrence, and an in-flight occurrence never overlaps its successor.
-   Failure/backoff, exhausted retries, cancellation, schedule edit, pause/retirement and interrupted state/commit writes are recoverable and accurately visible. A rejected push does not repeat completed work.
-   A finite invocation runs a recurring definition at most once and exits; persistent mode wakes using the same fake-clock-driven eligibility service without a restart, busy loop or paid idle calls.
-   Test custom task directories, nested projects and isolated execution. Operational scheduling state does not dirty Git, while task/check changes follow the existing scoped-commit rules.
-   Markdown tasks remain one-shot, existing agent Book semantics are unchanged, and all examples parse in the new task dialect. Future condition prose is visibly unsupported and cannot trigger an immediate run.
-   Use temporary workspaces, deterministic harness/check doubles and fake clocks. No live accounting data, provider announcements, tax services or actual financial actions are necessary to verify this feature.

## Context and documentation

-   Build on [task Books](2026-10-0060-ptbk-coder-task-books-and-migration.md), [not-before annotations](2026-10-0050-ptbk-coder-prompt-not-before.md), and [separate check commits](2026-10-0040-ptbk-coder-separate-check-commits.md).
-   Inspect [current queue lifecycle](../scripts/run-codex-prompts/main/runCodexPrompts.ts), [server orchestration](../scripts/run-codex-prompts/main/runCodexPromptsServer.ts), [round execution](../scripts/run-codex-prompts/main/runPromptRound.ts) and the source/persistence abstractions introduced by the prerequisites. Reuse current infrastructure rather than requiring the unimplemented unified server.
-   Keep the implementation DRY, modular and explicit about time semantics. Update CLI/help, task Book examples, [Coder documentation](../scripts/run-codex-prompts/README.md), relevant [Coder website](../apps/coder-landing) content and the [changelog](../changelog/_current-preversion.md) when implemented.
