# Promptbook Coder: main specification

**Standalone product and technical specification**

Version 1.0 | October 7, 2026 | For Pavol Hejný

**Purpose:** recreate Promptbook Coder as a clear, independently maintainable tool. Preserve its essential workflows and complete the currently specified transition to tasks without carrying over historical layers of the entire Promptbook monorepo.

**Decisive source:** `webgptorg/promptbook`, branch `main`, commit `12010a9a1f2df8b23c9c3934f0570caa6daa19da` from October 7, 2026, 10:58:27 CEST. All links in the [source map](coder/audit-and-sources.md) point to this snapshot.

**Document status:** a specification for future implementation only. The analysis draws on source code, tests, CLI, documentation and relevant PRDs. The production coder, paid models and the complete monorepo test suite were not run. Acceptance scenarios in this specification set are requirements for the new implementation rather than reports of tests already performed.

## Required outcome

Create a local CLI `ptbk coder` that loads prepared tasks from the selected project, selects eligible work, passes it to the selected agent through a coding harness, runs project checks, requests repairs if necessary, records the result and safely persists its own changes in Git. The user can observe, pause, stop or recover interrupted work, or operate in persistent mode.

Tasks and agents are human-readable files in the project. Git stores source assignments and work results. A coding harness is an interchangeable adapter; no particular provider, web application or database may be a prerequisite of the core itself.

The new implementation must preserve **observable behavior and protection of the user's work**, rather than the internal organization of historical scripts. The same task engine serves Markdown, task Books, CLI, check repairs and persistent execution. Do not create a second runner for the new format.

## How to interpret requirement status

- **Preserve**: Behavior evidenced by current code; the acceptance contract may clarify it.
- **Add according to PRD**: An intended feature from relevant unfinished assignments. Part of the target version.
- **New decision**: A recommended resolution of ambiguity or an improvement for the rewrite. Does not assert that the current coder behaves this way.
- **Deferred**: A known direction or historical PRD outside the base delivery; do not imply support.

The following normative statements using “must” describe the target implementation. In a conflict, precedence is: this specification set's explicit target contract, the latest relevant PRD, actual code, older documentation. A PRD status of `[x]` alone does not prove complete functionality; `[!]` does not imply that none of the requested changes exist in code.

## Navigating the specifications

This set of files was created by splitting the original coder assignment dated October 7, 2026. Requirement status, decisions and acceptance IDs remain preserved. Descriptions of current behavior in the audit refer to the stated snapshot rather than the latest release. For usage of the installed package, see the [coder guide](../docs/coder.md); for verification evidence, see the [compatibility record](../docs/compatibility.md).

The [Dictionary](dictionary.md) indexes important terms. [Book language](book-language.md) distinguishes the agent and task dialects. Each file below owns one contract and links to related specifications.

- [Coder scope](coder/scope.md): Included workflows, core boundaries and deferred directions.
- [Core concepts and data contracts](coder/domain-model.md): Terms, entities and normalized runtime states.
- [User and CLI contracts](coder/cli.md): Commands, options, precedence and first use.
- [Project paths and task sources](coder/workspace.md): Project paths, task sources and discovery.
- [Project initialization](coder/initialization.md): Idempotent setup and versioning of project files.
- [Git preflight](coder/git-preflight.md): Validate or initialize a Git repository before mutation.
- [Legacy Markdown tasks](coder/task-markdown.md): Legacy sections, status markers, priorities and routing.
- [Task Books](coder/task-books.md): Task dialect, control commitments and lossless payload.
- [Task eligibility](coder/eligibility.md): Shared evaluation of whether a task can be claimed.
- [Not-before: earliest start](coder/not-before.md): Time grammar, timezone and AFTER boundary.
- [Recurring task Books](coder/recurrence.md): Intervals, slots, schedule revisions and coalescing.
- [Agent Books and context](coder/agent-context.md): Agent instructions, Books and their snapshot.
- [Coding harnesses](coder/harnesses.md): Provider adapters, capabilities, login and outcomes.
- [TEAM consultations](coder/team.md): Advisory tools and consultation limits.
- [Read-only planning](coder/planning.md): Read-only permissions and approved task saving.
- [Execution lifecycle](coder/execution.md): One task's lifecycle from claim to finalization.
- [Project checks and repairs](coder/checks.md): Validation command, check view and check-feedback repairs.
- [Attempts, retries and provider limits](coder/retries.md): Attempt budget, technical retries and quota waiting.
- [Change ownership and Git persistence](coder/git-persistence.md): Owned scope, phase commits, dirty tree and identity.
- [Mutation lease, journal and recovery](coder/recovery.md): Mutation coordination, durable journal and explicit recovery.
- [Task isolation in a worktree](coder/isolation.md): Execution worktree and safe integration.
- [Git synchronization](coder/git-synchronization.md): Explicit pull/push and a separate sync outcome.
- [Migrating Markdown tasks to Books](coder/migration.md): Deterministic, restartable task conversion.
- [Persistent coder server](coder/server.md): Persistent supervision, dashboard and local API.
- [Terminal and run controls](coder/terminal.md): Normal/raw output, keys and cancellation.
- [Traces and results](coder/traces.md): Traceable results, usage and secret redaction.
- [Coder architecture](coder/architecture.md): Module boundaries, runtime and testable dependencies.
- [Compatibility and deliberate changes](coder/compatibility.md): Preserved behavior, deliberate changes and exit codes.
- [Acceptance scenarios](coder/acceptance.md): Original scenarios T01–T15, E01–E19 and U01–U14.
- [Operational quality](coder/operations.md): Offline operation, subprocesses and diagnostics.
- [Implementation stages and Definition of Done](coder/delivery.md): Stage ordering, documentation and conditions for completed delivery.
- [Audit and source map](coder/audit-and-sources.md): Audit snapshot, decisions and contract origins S01–S14.

## Historical specifications

[Deprecated / historical specifications](deprecated/_index.md) retain older material about the agent Book language and Agents Server. These files already carried a lower-authority warning; moving them does not deprecate Book language, commitments or individual agent capabilities. Server routes, database schemas and older technical details are not automatically coder contracts.

The old-prompts archive remains unchanged. A historical prompt is supporting material rather than proof that a feature is supported.
