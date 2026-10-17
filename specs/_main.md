# Promptbook (`ptbk`)

Promptbook is one npm package, `ptbk`, providing the `ptbk` command-line utility. It operates a Git-backed project of three Book entities: **agents**, **tasks** and **chats**. Each entity's first nonempty name line, normalized by a shared deterministic resolver, is its identity: no separate generated IDs or filename-based keys. `chats/` holds conversations, versioned `ptbk.json` holds settings, ignored `.ptbk/` holds runtime state and `traces/<name-key>/` holds name-derived task evidence.

Initialization is finite, attended technical setup. Its first new-project input is the user's intent, preserved verbatim with linked assets in `specs/_initial.md`. Init creates an ordinary Expert task referring to that specification, prepares selected harnesses and real checks, commits setup by default, and automatically starts the agenda as a background service. Project-specific content is created by the normal first task, not by a separate implementation phase inside init. The wizard returns without waiting for task completion or opening a dashboard; `ptbk dashboard` is its primary next-action hint.

Once started, the agenda is intended to run unattended for extended periods, progressing useful authorized work rather than remaining alive but silently waiting for routine approvals. It fills missing routing through Manager, executes one task at a time, creates and processes follow-ups, and discovers useful goal-driven work when the backlog is empty. Recoverable problems are handled automatically within bounds; human involvement is exceptional and explicit. Versioned changes from authoring and execution commit by default with `PTBK: ` subjects and applicable task IDs. Explicit `--no-commit` is the exception; `ptbk run` is the finite, explicitly configured queue workflow.

Functional setup and its UX are separate specification aspects. Init/add use finite wizards; init has visible step progress, Expert as a procedural visual guide and a brief success celebration. `ptbk dashboard` attaches a continuous, paneled terminal control view with recognizable agents and no overall completion. Suitable terminals default to rich presentation, with raw output available throughout. Terminal, lightweight browser SPA and independently usable API control the same process. HTTP includes protected remote tunneling by default, so a phone can use the displayed pairing QR from another network; `--no-tunnel` keeps access local. Agent-authored chats waiting for the user remain the most prominent attention items without becoming routine prerequisites for progress.

Tasks are correlated through declared normalized **names**, actual Git history and name-derived traces, not task IDs. Each independently accepted user↔agent message has its own commit; task-scoped agent↔agent messages join their owning task's result commit. A core agent **Fixer** regularly inspects and repairs project problems using ordinary task, chat and open-agent learning mechanisms. Traces retain available harness output, event logs and enabled browser recordings. Initialization saves separate trace-commit, video-ignore and video-recording choices in `ptbk.json`; `.ptbk/` and browser sessions remain ignored independently.

## Reading this specification

The [whitepaper](whitepaper.md) explains APT principles and clearly identified long-term directions. The files below define concrete target behavior, not a claim that it has already been implemented. Future capabilities in the whitepaper do not implicitly become product requirements.

Keep specifications in English, concise and focused on observable behavior, important contracts and invariants. Leave internal representations, algorithms and module organization to implementation unless they are themselves necessary product constraints. Preserve useful behavior, not incidental implementation detail. Keep functional contracts separate from visual presentation, with cross-links rather than duplicating both in a single primary document.

[Project model](concepts/project-model.md) · [Engine/project evolution](concepts/engine-and-project.md) · [Dictionary](dictionary.md) · [Agents](agents/_index.md) · [Book language](book-language/_index.md) · [References and lookup](book-language/references.md) · [Commitment index](book-language/commitments/_index.md)

## Installation and operation

- [Installation](cli/installation.md): Global/local package and destination-specific dependency setup.
- [Checks and publication on GitHub Actions](cli/releasing.md): Required hosted validation and verified releases.
- [Engine updates](cli/updates.md): Update the invoked installation, preserve setup input and rerun.
- [Commands](cli/cli.md): Command surface and options.
- [Configuration](cli/configuration.md): `ptbk.json`, defaults and temporary CLI overrides.
- [Workspace](cli/workspace.md): Project, source paths, specifications, traces and `.ptbk/`.
- [Initialization](cli/initialization.md): Technical setup, original input preservation and automatic background start.
- [First runnable task](cli/first-task.md): Ordinary Expert bootstrap from the initial specification, with no duplicate starter.
- [Nested projects](cli/nested-projects.md): Explicit Git boundaries for new child projects.
- [Finite run](cli/run.md): Execute existing work with one configuration.
- [Start](cli/start.md): Automatic work progression, ongoing operation and startup output.
- [Unattended operation](cli/autonomous-operation.md): A primary product invariant: sustained authorized work, automatic recovery and exceptional human involvement.
- [Process modes](cli/process-modes.md): Daemon/foreground placement, attached clients and one-shot lifecycle commands.
- [Startup persistence](cli/persistence.md): Recovery across operating-system restarts.

## Controls and interaction

- [CLI presentation and interaction](cli/interactive-ui.md): Pretty/raw output, finite wizards, live dashboards and one-shot results.
- [Initialization experience](cli/initialization-ui.md): Intent-first flow, step totals, the Expert guide and a finite celebratory finish.
- [Rich terminal composer](cli/rich-input.md): Multiline input, compact pasted blocks, images and preserved attachment payloads.
- [Help, about and version](cli/help.md): Command-scoped pretty/raw help and the actual running engine version.
- [Shared controls](cli/controls.md): One runtime control model with equivalent client capabilities.
- [Project status view](cli/status-view.md): Live/snapshot state, prominent requests and truthful local/remote connection information.
- [Dashboard panel layout](cli/dashboard-layout.md): Separate attention, work, queue, activity and connection regions.
- [Terminal dashboard](cli/terminal.md): Attach with `ptbk dashboard`, observe live state and use keyboard controls.
- [Service API](cli/api.md): Independently usable authenticated status and control endpoints.
- [Browser dashboard](cli/dashboard.md): Lightweight JavaScript SPA at `/`, consuming the service API.
- [Remote access](cli/remote-access.md): Default protected tunnel, mobile pairing, opt-out and lifecycle.
- [Tunnel provider decision](cli/tunnel-options.md): Researched alternatives and development/stable-hostname tradeoffs.
- [Chats](cli/chats.md): Durable named Book conversations and per-message commits.
- [Chat UI](cli/chat-ui.md): Direct `ptbk chat`, dashboard shortcuts, conversations and unread/actionable states.
- [Human interactions](cli/user-interactions.md): Agent-authored waiting chats and once-only human response semantics.
- [Channels](cli/channels.md): Terminal, CLI answers, browser app and API.
- [Browser](cli/browser.md): Four profiles with dedicated global Promptbook default, safe shared ownership and task-linked recordings.

## Agents and work

- [Agent context](cli/agent-context.md): Effective role, task and project instructions.
- [Agent visual identity](agents/visual-identity.md): Coder-inspired mascot badges, name-based identity and truthful activity.
- [Fixer](agents/fixer.md): Ordinary OPEN core agent for ongoing introspection, safe repair and human chats.
- [Harnesses](cli/harnesses.md): Complete selected setup, global installations, authentication and execution.
- [Harness plugins](cli/harness-plugins.md): Common setup/execution/evidence contract and featured/More presentation.
- [Harness updates](cli/harness-updates.md): Selected setup updates and safe ongoing maintenance.
- [TEAM consultations](cli/team.md): Cooperation within one task.
- [Authoring and saving](cli/authoring.md): Commit add and other approved versioned changes before dispatch.
- [Task Books](cli/task-books.md): Readable bounded work and completion stamps.
- [Markdown tasks](cli/task-markdown.md): Supported checkmark-based task sources.
- [Task identity](cli/task-identity.md): First-line names, collision precedence, occurrences and name-derived audit history.
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
- [Retries](cli/retries.md): Bounded automatic repairs, authentication and provider waiting.
- [Git preflight](cli/git-preflight.md): Workspace readiness and safe initialization.
- [Git persistence](cli/git-persistence.md): Default operation commits, task-ID correlation, trace inclusion, explicit opt-out and ownership.
- [Git synchronization](cli/git-synchronization.md): Optional pull/push and pending sync.
- [Recovery](cli/recovery.md): Interrupted work without duplication or data loss.
- [Isolation](cli/isolation.md): Optional worktree execution and integration.
- [Task traces](cli/traces.md): Name-derived task harness output, event logs, browser replay, Git correlation and redaction.
- [Trace configuration](cli/trace-configuration.md): Independent recording and Git/video-inclusion decisions saved during init.
- [Planning](cli/planning.md): Read-only discussion and approved task saving.
- [Migration](cli/migration.md): Lossless Markdown-to-Book conversion.
- [Operational quality](cli/operations.md): Cross-platform, bounded and observable operation.
- [Acceptance scenarios](cli/acceptance.md): Representative verifiable product outcomes; topic-specific contracts add focused acceptance outcomes.
