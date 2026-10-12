# Promptbook (`ptbk`)

Promptbook is one npm package, `ptbk`, providing the `ptbk` command-line utility. It operates agents over a selected project directory in Git. Agents, tasks and project material are readable files; versioned `ptbk.json` holds project configuration, while Git-ignored `.ptbk/` holds local runtime state, without a database.

Initialize or clone a project, then use `ptbk start` to operate its agenda indefinitely. Start selects from project agents and enabled, usable global harnesses, executes one task at a time, checks the result and commits work together with its completion. `ptbk run` is the finite, explicitly configured queue workflow. Interactive init is a wizard; interactive start/run share a live dashboard. Terminal, lightweight localhost page and REST API control the same process.

## Reading this specification

The [whitepaper](whitepaper.md) explains APT principles and clearly identified long-term directions. The files below define concrete target behavior, not a claim that it has already been implemented. Future capabilities in the whitepaper do not implicitly become product requirements.

Keep specifications in English, concise and focused on observable behavior, important contracts and invariants. Leave internal representations, algorithms and module organization to implementation unless they are themselves necessary product constraints. Preserve useful behavior, not incidental implementation detail.

[Dictionary](dictionary.md) · [Agents](agents/_index.md) · [Book language](book-language/_index.md) · [Commitment index](book-language/commitments/_index.md)

## Installation and operation

- [Installation](cli/installation.md): Global/local package and destination-specific dependency setup.
- [Engine updates](cli/updates.md): Update the invoked installation, then rerun.
- [Commands](cli/cli.md): Command surface and options.
- [Configuration](cli/configuration.md): `ptbk.json`, defaults and temporary CLI overrides.
- [Workspace](cli/workspace.md): Project, source paths and `.ptbk/`.
- [Initialization](cli/initialization.md): Incremental setup, no-op repetition and intent-led creation.
- [Nested projects](cli/nested-projects.md): Explicit Git boundaries for new child projects.
- [Finite run](cli/run.md): Execute existing work with one configuration.
- [Start](cli/start.md): Autonomous ongoing operation and startup output.
- [Process modes](cli/process-modes.md): Daemon, raw, interactive and lifecycle commands.
- [Startup persistence](cli/persistence.md): Recovery across operating-system restarts.

## Controls and interaction

- [Interactive and noninteractive UI](cli/interactive-ui.md): Wizard/dashboard patterns and shared rich text entry.
- [Help, about and version](cli/help.md): Readable guidance and the actual running engine version.
- [Shared controls](cli/controls.md): One runtime control model.
- [Terminal](cli/terminal.md): Live start/run dashboard, plain output and controls.
- [Local dashboard and REST API](cli/dashboard.md): Minimal synchronized HTTP interface.
- [User interactions](cli/user-interactions.md): General questions, confirmations and human actions.
- [Channels](cli/channels.md): Terminal, CLI answers, page and API.
- [Browser](cli/browser.md): One independently configured browser/profile per project.

## Agents and work

- [Agent context](cli/agent-context.md): Effective role, task and project instructions.
- [Harnesses](cli/harnesses.md): Project selection, global setup, authentication and execution.
- [Harness plugins](cli/harness-plugins.md): Common integration contract and featured/More presentation.
- [Harness updates](cli/harness-updates.md): Selected setup updates and safe ongoing maintenance.
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
- [Errors](cli/errors.md): Understandable failures, diagnostic evidence and next actions.
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
