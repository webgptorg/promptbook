# Promptbook (`ptbk`)

Promptbook is one npm package, `ptbk`, providing the `ptbk` command-line utility. It operates agents over a selected project directory in Git. Agents, tasks and project material are readable files; versioned `ptbk.json` holds project configuration, while Git-ignored `.ptbk/` holds local runtime state, without a database.

Successful initialization leaves selected harnesses, real checks and a first runnable task ready for plain `ptbk start`, without another setup step. Start launches the agenda as a background service and reports once while actual work begins automatically. It fills missing routing through Manager, executes one task at a time, checks and commits results, and discovers useful goal-driven work when the backlog is empty. `ptbk run` is the finite, explicitly configured queue workflow. Init/add use finite wizards; `ptbk dashboard` attaches a continuous terminal control view to the existing service. Suitable terminals default to rich presentation, with raw output available throughout. Terminal, lightweight browser SPA and independently usable local API inspect and control the same process.

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
- [Initialization](cli/initialization.md): Complete selected setup, ready-to-start completion and no-op repetition.
- [First runnable task](cli/first-task.md): Safe initial work, normal execution and no duplicate starter tasks.
- [Nested projects](cli/nested-projects.md): Explicit Git boundaries for new child projects.
- [Finite run](cli/run.md): Execute existing work with one configuration.
- [Start](cli/start.md): Automatic work progression, ongoing operation and startup output.
- [Process modes](cli/process-modes.md): Daemon/foreground placement, attached clients and one-shot lifecycle commands.
- [Startup persistence](cli/persistence.md): Recovery across operating-system restarts.

## Controls and interaction

- [CLI presentation and interaction](cli/interactive-ui.md): Pretty/raw output, finite wizards, live dashboards and one-shot results.
- [Help, about and version](cli/help.md): Command-scoped pretty/raw help and the actual running engine version.
- [Shared controls](cli/controls.md): One runtime control model with equivalent client capabilities.
- [Project status view](cli/status-view.md): One live/snapshot view with prominent requests, status, URL and QR code.
- [Terminal dashboard](cli/terminal.md): Attach with `ptbk dashboard`, observe live state and use keyboard controls.
- [Local service API](cli/api.md): Independently usable status and control endpoints.
- [Browser dashboard](cli/dashboard.md): Lightweight JavaScript SPA at `/`, consuming the service API.
- [User interactions](cli/user-interactions.md): Highly visible, actionable human requests and response semantics.
- [Channels](cli/channels.md): Terminal, CLI answers, browser app and API.
- [Browser](cli/browser.md): One independently configured browser/profile per project.

## Agents and work

- [Agent context](cli/agent-context.md): Effective role, task and project instructions.
- [Agent visual identity](agents/visual-identity.md): Automatic stable avatars, cross-interface recognition and truthful activity.
- [Harnesses](cli/harnesses.md): Complete selected setup, global installations, authentication and execution.
- [Harness plugins](cli/harness-plugins.md): Common integration contract and featured/More presentation.
- [Harness updates](cli/harness-updates.md): Selected setup updates and safe ongoing maintenance.
- [TEAM consultations](cli/team.md): Cooperation within one task.
- [Task Books](cli/task-books.md): Readable bounded work and completion stamps.
- [Markdown tasks](cli/task-markdown.md): Supported checkmark-based task sources.
- [Task origins](cli/task-origins.md): Explicit, derived and goal-driven work.
- [Task relationships](cli/task-relationships.md): References, subtasks and prerequisites.
- [Eligibility](cli/eligibility.md): Ready work, automatic assignment candidates and real constraints.
- [Goal discovery](cli/goal-discovery.md): Automatic due enquiries when no backlog remains.
- [Earliest start](cli/not-before.md): Time boundaries and timezone.
- [Recurrence](cli/recurrence.md): Repeated occurrences and downtime.

## Results, safety and service workflows

- [Execution](cli/execution.md): The common task lifecycle.
- [Checks](cli/checks.md): Real initialized validation and repair.
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
