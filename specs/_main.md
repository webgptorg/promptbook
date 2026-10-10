# Promptbook (`ptbk`)

Promptbook is one npm package, `ptbk`, providing the `ptbk` command-line utility. It operates agents over a selected project directory in Git. Agents, tasks and project material are readable files; project-local runtime state lives in Git-ignored `.ptbk/`, without a database.

Initialize or clone a project, then use `ptbk start` to operate its agenda indefinitely. Start automatically selects from available agents and authenticated harnesses, executes one task at a time, checks the result and commits work together with its completion. `ptbk run` is the finite, explicitly configured queue workflow. Terminal, lightweight localhost page and REST API control the same process.

## Reading this specification

The [whitepaper](whitepaper.md) explains APT principles and clearly identified long-term directions. The files below define concrete target behavior, not a claim that it has already been implemented. Future capabilities in the whitepaper do not implicitly become product requirements.

Keep specifications in English, concise and focused on observable behavior, important contracts and invariants. Leave internal representations, algorithms and module organization to implementation unless they are themselves necessary product constraints. Preserve useful behavior, not incidental implementation detail.

[Dictionary](dictionary.md) · [Agents](agents/_index.md) · [Book language](book-language/_index.md) · [Commitment index](book-language/commitments/_index.md)

## Installation and operation

- [Installation](cli/installation.md): Global/local package and project-specific versions.
- [Commands and configuration](cli/cli.md): Command surface and options.
- [Workspace](cli/workspace.md): Project, source paths and `.ptbk/`.
- [Initialization](cli/initialization.md): Repeatable setup and Expert-led agenda creation.
- [Finite run](cli/run.md): Execute existing work with one configuration.
- [Start](cli/start.md): Autonomous ongoing operation and startup output.
- [Process modes](cli/process-modes.md): Daemon, raw, interactive and lifecycle commands.
- [Startup persistence](cli/persistence.md): Recovery across operating-system restarts.

## Controls and interaction

- [Shared controls](cli/controls.md): One runtime control model.
- [Terminal](cli/terminal.md): Foreground presentation and controls.
- [Local dashboard and REST API](cli/dashboard.md): Minimal synchronized HTTP interface.
- [User interactions](cli/user-interactions.md): General questions, confirmations and human actions.
- [Channels](cli/channels.md): Terminal, CLI answers, page and API.
- [Browser](cli/browser.md): Shared persistent profile and authenticated external context.

## Agents and work

- [Agent context](cli/agent-context.md): Effective role, task and project instructions.
- [Harnesses](cli/harnesses.md): Availability, authentication, models and capabilities.
- [TEAM consultations](cli/team.md): Cooperation within one task.
- [Task Books](cli/task-books.md): Readable bounded work and completion stamps.
- [Markdown tasks](cli/task-markdown.md): Supported checkmark-based task sources.
- [Task origins](cli/task-origins.md): Explicit, derived and goal-driven work.
- [Task relationships](cli/task-relationships.md): References, subtasks and prerequisites.
- [Eligibility](cli/eligibility.md): Ready work, priorities and constraints.
- [Goal discovery](cli/goal-discovery.md): Work enquiry only when no backlog remains.
- [Earliest start](cli/not-before.md): Time boundaries and timezone.
- [Recurrence](cli/recurrence.md): Repeated occurrences and downtime.

## Results, safety and service workflows

- [Execution](cli/execution.md): The common task lifecycle.
- [Checks](cli/checks.md): Validation and repair.
- [Retries](cli/retries.md): Budgets, authentication and provider waiting.
- [Git preflight](cli/git-preflight.md): Workspace readiness and safe initialization.
- [Git persistence](cli/git-persistence.md): One task-result commit and change ownership.
- [Git synchronization](cli/git-synchronization.md): Optional pull/push and pending sync.
- [Recovery](cli/recovery.md): Interrupted work without duplication or data loss.
- [Isolation](cli/isolation.md): Optional worktree execution and integration.
- [Traces](cli/traces.md): Actual evidence, learning inputs and sensitive data.
- [Planning](cli/planning.md): Read-only discussion and approved task saving.
- [Migration](cli/migration.md): Lossless Markdown-to-Book conversion.
- [Operational quality](cli/operations.md): Cross-platform, bounded and observable operation.
- [Acceptance scenarios](cli/acceptance.md): Representative verifiable product outcomes.
