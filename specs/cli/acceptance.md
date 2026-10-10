# Acceptance scenarios

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

The implementation is acceptable only after the following scenarios have been verified using temporary projects, local Git repositories and deterministic harness/check doubles. Paid models are not a prerequisite for the regression suite. Real-provider smoke tests are separate and explicit.

## Tasks and time

- **T01**: Legacy `.md`, task `.book` and a mixed queue execute equivalent work through the same execution service, each identity at most once.
- **T02**: README, the ignore marker, nested archive/trace, `@@@`, `[-]`, `[.]`, `[x]`, `[!]`, `[^]` do not run as new tasks.
- **T03**: A markerless task is ready with priority 0; add state without losing the first content. With multiple sections, change only the correct section.
- **T04**: Priorities sort highest first, bounds are inclusive and ties stable. Invalid bounds produce an error.
- **T05**: Legacy `gpt`/`opus` remains OR substring matching. Book AGENT/HARNESS/MODEL form AND conditions, and RUNNER an additional OR group.
- **T06**: A date-only token is not confused with routing; a model containing a date remains a model. A date in the body/URL/report does not schedule work.
- **T07**: A task does not start 1 ms before the boundary and may start exactly at it; verify timezone, leap day, offset and DST ambiguity using a fake clock.
- **T08**: An invalid/conflicting date or interval is visibly blocked; it does not become unrestricted ready work.
- **T09**: A future high-priority task does not block a ready task. `S` does not release it. A finite run exits with information about future work.
- **T10**: Book round-trip preserves literal uppercase commitments, fences, Unicode, assets and history. An agent Book does not become a task.
- **T11**: Duplicate IDs/missing control metadata and concurrent source edits prevent incorrect execution/finalization.
- **T12**: Weekly recurrence preserves the `todo` definition, anchor, due slot and history across restart and rename. A slow run does not shift the anchor.
- **T13**: Several weeks of downtime produce one coalesced occurrence. No overlap for the same task or catch-up storm.
- **T14**: A finite run executes a recurring definition at most once; persistent mode executes a later slot afterward, without paid idle calls.
- **T15**: Pause/retirement, schedule edits, exhausted retries and ambiguous interruption produce the correct blocked/next-due state.

## Execution, checks and Git

- **E01**: A run without checks reports checks skipped; with `--check`, it checks actual changes. A missing check is not success.
- **E02**: `yes-and-fail` persists the eligible check delta and exits; `yes-and-fix` repairs before it may enter the queue.
- **E03**: On a healthy project, `fix` requires neither an installed harness nor a default Book, and creates neither a PRD nor an empty commit. Harness selection remains CLI configuration. Persist a formatter-only delta.
- **E04**: On failure, `fix` repairs the same task up to the allowed attempt count; no other backlog task is selected.
- **E05**: The agent and a check change the same line: the first commit contains agent content, the second the check transformation.
- **E06**: A failed check creates its own delta commit with the actual outcome; validation still failed.
- **E07**: Add/delete/rename/mode/symlink/binary changes and ignored generated content survive the correct phases, repair and recheck.
- **E08**: Pre-existing staged+unstaged changes retain their original content and staging state. An empty owned delta does not create a commit from someone else's index.
- **E09**: A concurrent editor, changed HEAD/index and a content-modifying hook stop ambiguous persistence and preserve both parties' work.
- **E10**: Commit/signing failure does not call the model again; completion remains pending. A rejected push preserves the local commit without duplication.
- **E11**: Automatic `--no-commit` requires ignore; the supervised exception works. No automatic commit occurs, and owned scope remains separate across multiple tasks.
- **E12**: `continue` restores one proven interrupted task rather than someone else's dirty bytes; 0/2 candidates fail.
- **E13**: Termination between claim, source change, check, commit intent, actual commit and result write is reconciled safely.
- **E14**: Two processes, server + run or migration + run cannot simultaneously acquire the same claim/mutation ownership. A stale lease is not taken over automatically.
- **E15**: Owned state/locks/check views are created under `.promptbook`; no owned runtime files are written directly into `.git`.
- **E16**: Isolation maps nested projects and custom tasks; success preserves commits, while a conflict preserves the worktree and original work.
- **E17**: Interruption terminates only the owned process tree and waits, preserving diagnostics; it does not terminate other Node processes.
- **E18**: Quota/auth/credits and retry budget are distinguished; prohibited credits are not used.
- **E19**: A usage-limit error + `tokens used` + exit 1, or JSON `turn.failed`, never publishes completion or false success.

## Migration, CLI and interfaces

- **U01**: Running init twice preserves custom Books/scripts/AGENTS/env, does not treat documentation as a task and does not fake a check.
- **U02**: `--path`, relative/absolute `--tasks`, spaces, nested projects and symlink escapes behave consistently in all relevant commands.
- **U03**: List/help/dry-run do not write, create directories, install or call a model. Missing explicit input is an error.
- **U04**: Migration dry-run has no side effects; actual conversion of multiple sections preserves meaning, references, history and original bytes.
- **U05**: Restarting migration at every transaction boundary never produces two runnable copies. Rerun does not duplicate files/commits.
- **U06**: A changed destination/source, ID collision or some unconvertible sections cause no overwrites or premature archiving.
- **U07**: Developer is the default even for plan; an explicit Planner works. An invalid Book does not cause silent fallback.
- **U08**: A TEAM advisor is called only on request, with its own role; the inheritance resolver and remote/local boundary remain within workspace policy.
- **U09**: Plan and its advisors cannot modify application code or launch a shell; an approved PRD save is confined to the correct files.
- **U10**: Normal/raw toggling preserves one run and one stream; scroll/resize/bounded buffers and non-TTY output remain readable.
- **U11**: The server claims through the same engine and observes source edits and due time; mutating APIs require valid local context and the correct source revision.
- **U12**: `verify` performs human review/archive and follow-up; it does not run checks or make unapproved review changes in no-questions mode.
- **U13**: The single packaged ptbk CLI works through its top-level commands in an external fixture project, including Books, templates, the planning bridge and harness adapters without monorepo paths. Help, examples and newly generated command invocations use the ptbk command root.
- **U14**: A trace reports actual outcomes/commit IDs; a known fixture secret appears in neither output nor versioned artifacts.

## Related specifications

- [Legacy Markdown tasks](task-markdown.md)
- [Task Books](task-books.md)
- [Recurring task Books](recurrence.md)
- [Project checks and repairs](checks.md)
- [Change ownership and Git persistence](git-persistence.md)
- [Migrating Markdown tasks to Books](migration.md)
- [Implementation stages and Definition of Done](delivery.md)
