# Promptbook (`ptbk`): main specification

Promptbook is the `ptbk` command-line utility. Its commands, task engine, agent and task Books, harness adapters and local dashboard form one product.

## Required outcome

Create a local CLI `ptbk` that loads prepared tasks from the selected project, selects eligible work, passes it to the selected agent through a coding harness, runs project checks, requests repairs if necessary, records the result and safely persists its own changes in Git. The user can observe, pause, stop or recover interrupted work, or operate in persistent mode.

Tasks and agents are human-readable files in the project. Git stores source assignments and work results. A coding harness is an interchangeable adapter; no particular provider, web application or database may be a prerequisite of the core itself.

The new implementation must preserve **observable behavior and protection of the user's work**, rather than the internal organization of historical scripts. The same task engine serves Markdown, task Books, CLI, check repairs and persistent execution. Do not create a second runner for the new format.

## How to interpret requirement status

- **Preserve**: Behavior evidenced by current code; the acceptance contract may clarify it.
- **Add according to PRD**: An intended feature from relevant unfinished assignments. Part of the target version.
- **New decision**: A recommended resolution of ambiguity or an improvement for the rewrite. Does not assert that the analyzed CLI behaves this way.
- **Deferred**: A known direction or historical PRD outside the base delivery; do not imply support.

The following normative statements using “must” describe the target implementation. In a conflict, precedence is: this specification set's explicit target contract, the latest relevant PRD, actual code, older documentation. A PRD status of `[x]` alone does not prove complete functionality; `[!]` does not imply that none of the requested changes exist in code.

## Navigating the specifications

This set of files was created by splitting the original CLI assignment dated October 7, 2026. Requirement status, decisions and acceptance IDs remain preserved. The target command namespace is `ptbk`; historical command names and source paths identify earlier versions. Descriptions of current behavior in the audit refer to the stated snapshot rather than the latest release. For usage of the installed package, see the [installed CLI guide](../docs/coder.md); for verification evidence, see the [compatibility record](../docs/compatibility.md).

The [Dictionary](dictionary.md) indexes important terms. [Book language](book-language.md) distinguishes the agent and task dialects. Each file below owns one contract and links to related specifications.

- [Product scope](cli/scope.md): Included workflows, core boundaries and deferred directions.
- [Core concepts and data contracts](cli/domain-model.md): Terms, entities and normalized runtime states.
- [User and CLI contracts](cli/cli.md): Commands, options, precedence and first use.
- [Project paths and task sources](cli/workspace.md): Project paths, task sources and discovery.
- [Project initialization](cli/initialization.md): Idempotent setup and versioning of project files.
- [Git preflight](cli/git-preflight.md): Validate or initialize a Git repository before mutation.
- [Legacy Markdown tasks](cli/task-markdown.md): Legacy sections, status markers, priorities and routing.
- [Task Books](cli/task-books.md): Task dialect, control commitments and lossless payload.
- [Task eligibility](cli/eligibility.md): Shared evaluation of whether a task can be claimed.
- [Not-before: earliest start](cli/not-before.md): Time grammar, timezone and AFTER boundary.
- [Recurring task Books](cli/recurrence.md): Intervals, slots, schedule revisions and coalescing.
- [Agent Books and context](cli/agent-context.md): Agent instructions, Books and their snapshot.
- [Coding harnesses](cli/harnesses.md): Provider adapters, capabilities, login and outcomes.
- [TEAM consultations](cli/team.md): Advisory tools and consultation limits.
- [Read-only planning](cli/planning.md): Read-only permissions and approved task saving.
- [Execution lifecycle](cli/execution.md): One task's lifecycle from claim to finalization.
- [Project checks and repairs](cli/checks.md): Validation command, check view and check-feedback repairs.
- [Attempts, retries and provider limits](cli/retries.md): Attempt budget, technical retries and quota waiting.
- [Change ownership and Git persistence](cli/git-persistence.md): Owned scope, phase commits, dirty tree and identity.
- [Mutation lease, journal and recovery](cli/recovery.md): Mutation coordination, durable journal and explicit recovery.
- [Task isolation in a worktree](cli/isolation.md): Execution worktree and safe integration.
- [Git synchronization](cli/git-synchronization.md): Explicit pull/push and a separate sync outcome.
- [Migrating Markdown tasks to Books](cli/migration.md): Deterministic, restartable task conversion.
- [Persistent mode and dashboard](cli/server.md): Persistent supervision, dashboard and local API.
- [Terminal and run controls](cli/terminal.md): Normal/raw output, keys and cancellation.
- [Traces and results](cli/traces.md): Traceable results, usage and secret redaction.
- [CLI architecture](cli/architecture.md): Module boundaries, runtime and testable dependencies.
- [Compatibility and deliberate changes](cli/compatibility.md): Preserved behavior, deliberate changes and exit codes.
- [Acceptance scenarios](cli/acceptance.md): Original scenarios T01–T15, E01–E19 and U01–U14.
- [Operational quality](cli/operations.md): Offline operation, subprocesses and diagnostics.
- [Implementation stages and Definition of Done](cli/delivery.md): Stage ordering, documentation and conditions for completed delivery.
- [Audit and source map](cli/audit-and-sources.md): Audit snapshot, decisions and contract origins S01–S14.

## Historical specifications

[Deprecated / historical specifications](deprecated/_index.md) retain older material about the agent Book language, Agents Server and the [APT whitepaper](deprecated/whitepaper.md). They provide language context and provenance for earlier designs; the current `ptbk` CLI contracts define Promptbook's product scope. Retaining this material does not deprecate Book language, commitments or individual agent capabilities. Historical server routes, database schemas and broader product claims do not add CLI requirements.

The old-prompts archive remains unchanged. A historical prompt is supporting material rather than proof that a feature is supported.
