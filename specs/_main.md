# Promptbook (`ptbk`)

Promptbook is one npm package, `ptbk`, providing the `ptbk` command-line utility. It operates a Git-backed project of three Book entities: **agents**, **tasks** and **chats**. Every canonical Book starts with `AGENT <name>`, `TASK <name>` or `CHAT <name>`; all share commitment syntax. The normalized opening name content is logical identity, with no separate generated IDs or filename-based logical keys. New system-created task/chat names include readable creation date/time to prevent collisions, without mandatory timestamp grammar. `chats/` holds conversations, versioned `ptbk.json` holds defaults, ignored `.ptbk/` holds runtime state and `traces/<task-file-basename>/` holds evidence under the literal task filename without `.book` or legacy `.md`.

Initialization is finite attended technical setup. Its first new-project input is user intent, preserved verbatim with linked assets in `specs/_initial.md`. Init creates an ordinary Expert bootstrap referring to it, prepares selected harnesses/checks and missing core roles, commits setup by default and automatically starts the background agenda. Project content comes from that ordinary task, not an implementation phase inside init. The wizard returns without waiting for task completion or opening a dashboard; `ptbk dashboard` is its primary next-action hint.

Every engine owns one concrete project directory; exclusive locking prevents two owners even across different installations. It runs with zero or many observing clients. A dashboard is a lightweight view/controller, not an engine or independent scheduler: opening/closing it never starts/stops the service. Shared lifecycle states are **`running`, `pausing`, `pause`, `stopping`**. Pause/ordinary stop drain current work without starting another task; pending requests can be cancelled or changed. Force stop is immediate, with best-effort owner cleanup when handled internally; an external hard kill has no cleanup guarantee. CLI, terminal, browser and API use the same engine operations.

`ptbk dashboard --global` is a separate continuously refreshed host-wide table of running project engines, across installation/version boundaries and independent of current directory. It stays open with zero entries, notices later starts and attaches to a selected project dashboard without `cd` or starting a worker. There is no global engine. Ordinary project dashboard entry still reports a missing service actionably.

The agenda is intended to progress useful authorized work unattended for extended periods, not remain alive while silently waiting for routine approvals. It fills missing routing through Manager, executes one task at a time, processes follow-ups and discovers useful goal-driven work when no backlog remains, while respecting deliberate pause/stop intent. Recoverable problems are handled automatically within bounds; human involvement is exceptional. Versioned authoring/execution changes commit by default with `PTBK: ` subjects and applicable name correlation. Explicit `--no-commit` is the exception; `ptbk run` is a finite configured queue workflow.

Functional contracts and UX are separate aspects. Init/add use finite wizards; init has visible progress, Expert as visual guide and a brief success celebration. The project dashboard has distinct panels and prominent lifecycle controls; detailed effective harness/model/thinking configuration and browser profile/diagnostics are initially collapsed, keyboard-accessible panels. Browser diagnosis/recovery is automatic by default, with safe manual recheck/retry/restart controls. Rich terminals default to pretty presentation with raw alternatives. Terminal, lightweight browser SPA and independently usable API control the same engine. HTTP includes protected remote access by default; `--no-tunnel` keeps it local.

**Chatter** is an editable core agent and the default conversational entry for manually discussing/directing a project. New chat first offers Chatter (Enter) or another agent; only the latter expands all valid targets. Its initial TEAM includes the other initialized roles; it handles basic authorized actions and consults/delegates to specialists through ordinary mechanisms. Existing chats and waiting questions retain their real authors. Fixer remains an ordinary OPEN maintenance agent. Human-facing messages commit individually; internal task consultations join their task result, while conversation-scoped consultations use ordinary scoped authoring persistence.

Task logical identity, source/Git provenance and evidence storage remain distinct. Trace directories exactly match source basenames, not normalized TASK names or opaque keys; evidence records declared names and source revisions to preserve history across renames. Traces retain actually available harness output, events and enabled browser recordings. Init saves separate trace-commit, video-ignore and video-recording choices; `.ptbk/` and browser sessions stay ignored independently.

## Reading this specification

The [whitepaper](whitepaper.md) explains APT principles and clearly identified long-term directions. The files below define concrete target behavior, not a claim of implementation. Future whitepaper capabilities do not implicitly become requirements.

Keep specifications in English, concise and focused on observable behavior, important contracts and invariants. Leave internal representations, algorithms and module organization to implementation unless they are necessary product constraints. Preserve useful behavior, not incidental implementation detail. Separate functional contracts from visual presentation and cross-link instead of duplicating their full definitions.

[Project model](concepts/project-model.md) · [Engine/project evolution](concepts/engine-and-project.md) · [Dictionary](dictionary.md) · [Agents](agents/_index.md) · [Book language](book-language/_index.md) · [References and lookup](book-language/references.md) · [Commitment index](book-language/commitments/_index.md)

## Installation and operation

- [Installation](cli/installation.md): Global/local package and destination-specific dependency setup.
- [Checks and publication on GitHub Actions](cli/releasing.md): Required hosted validation and verified releases.
- [Engine updates](cli/updates.md): Update the invoked installation, preserve setup input and rerun.
- [Commands](cli/cli.md): Command surface and options, including pause/resume, force stop and global dashboard.
- [Configuration](cli/configuration.md): `ptbk.json`, defaults and temporary overrides.
- [Workspace](cli/workspace.md): Project/source paths, specifications, traces, runtime and external discovery metadata.
- [Initialization](cli/initialization.md): Technical setup, original input preservation, core agents and automatic background start.
- [First runnable task](cli/first-task.md): Ordinary Expert bootstrap without a duplicate starter.
- [Nested projects](cli/nested-projects.md): Explicit Git boundaries for child projects.
- [Finite run](cli/run.md): Existing work with one configuration.
- [Start](cli/start.md): Automatic work progression, ongoing operation and startup output.
- [Unattended operation](cli/autonomous-operation.md): Sustained authorized work, recovery and exceptional human involvement.
- [Process modes](cli/process-modes.md): Engine placement and independent observing clients.
- [Service lifecycle](cli/service-lifecycle.md): Four states, draining, cancellation, restart, force stop and signal semantics.
- [Project locking](cli/locking.md): One engine per project and owner-only controlled cleanup.
- [Startup persistence](cli/persistence.md): Recovery across operating-system restarts.

## Controls and interaction

- [CLI presentation and interaction](cli/interactive-ui.md): Pretty/raw output, finite wizards, live views and one-shot results.
- [Initialization experience](cli/initialization-ui.md): Intent-first flow, step totals, Expert guide and finite celebration.
- [Rich terminal composer](cli/rich-input.md): Multiline input, pasted blocks, images and preserved attachments.
- [Help, about and version](cli/help.md): Scoped help and actual running version.
- [Shared controls](cli/controls.md): One engine-owned control model across clients.
- [Project status view](cli/status-view.md): Live/snapshot state, prominent requests and truthful connection data.
- [Dashboard panel layout](cli/dashboard-layout.md): Attention, work, visible lifecycle controls and supporting panels.
- [Dashboard details](cli/dashboard-details.md): Collapsible actual execution configuration and browser diagnostics/recovery UI.
- [Terminal dashboard](cli/terminal.md): Independent project attachment and keyboard controls.
- [Global dashboard](cli/global-dashboard.md): Host-wide registration/discovery, live table, zero-service state and project attachment.
- [Service API](cli/api.md): Independently usable authenticated status/control operations.
- [Browser dashboard](cli/dashboard.md): Lightweight JavaScript SPA consuming the same service API.
- [Remote access](cli/remote-access.md): Protected tunnel, mobile pairing, opt-out and lifecycle.
- [Tunnel provider decision](cli/tunnel-options.md): Alternatives and stable-hostname tradeoffs.
- [Chats](cli/chats.md): Durable named conversations, author attribution and persistence boundaries.
- [Chat UI](cli/chat-ui.md): Chatter-first entry, explicit alternatives, existing threads and unread/actionable states.
- [Human interactions](cli/user-interactions.md): Attributed waiting chats and once-only replies.
- [Channels](cli/channels.md): Terminal, CLI, browser and API.
- [Browser](cli/browser.md): Four profile sources, effective-profile inspection, safe ownership and automatic/manual recovery.

## Agents and work

- [Agent context](cli/agent-context.md): Effective role, task and project instructions.
- [Agent visual identity](agents/visual-identity.md): Mascot badges, name identity and truthful activity.
- [Chatter](agents/chatter.md): Default core conversational entry, initialized TEAM and ordinary specialist delegation.
- [Fixer](agents/fixer.md): OPEN core introspection, repair and human chats.
- [Harnesses](cli/harnesses.md): Selected setup, global installations, authentication and execution.
- [Harness plugins](cli/harness-plugins.md): Common setup/execution/evidence contract and featured/More presentation.
- [Harness updates](cli/harness-updates.md): Selected setup updates and safe maintenance.
- [TEAM consultations](cli/team.md): Bounded task- or conversation-scoped specialist advice.
- [Authoring and saving](cli/authoring.md): Commit authorized versioned changes before dispatch.
- [Generated names](cli/generated-names.md): Creation date/time, normalized collisions and separate filenames.
- [Task Books](cli/task-books.md): Readable bounded work and completion stamps.
- [Markdown tasks](cli/task-markdown.md): Checkmark-based compatibility sources.
- [Task identity](cli/task-identity.md): Opening TASK name, collisions and historical provenance, separate from trace filenames.
- [Task origins](cli/task-origins.md): Explicit, derived and goal-driven work.
- [Task relationships](cli/task-relationships.md): References, subtasks and prerequisites.
- [Eligibility](cli/eligibility.md): Ready work, assignment candidates and constraints.
- [Goal discovery](cli/goal-discovery.md): Due enquiries when no backlog remains.
- [Earliest start](cli/not-before.md): Time boundaries and timezone.
- [Recurrence](cli/recurrence.md): Repeated occurrences and downtime.

## Results, safety and service workflows

- [Execution](cli/execution.md): Task lifecycle and no new claims during pause/stop draining.
- [Checks](cli/checks.md): Real initialized validation and repair.
- [Errors](cli/errors.md): Understandable failures, evidence and next actions.
- [Retries](cli/retries.md): Bounded automatic repair and provider/authentication waits.
- [Git preflight](cli/git-preflight.md): Workspace readiness and safe initialization.
- [Git persistence](cli/git-persistence.md): Operation commits, name correlation, trace inclusion and ownership.
- [Git synchronization](cli/git-synchronization.md): Optional pull/push and pending synchronization.
- [Recovery](cli/recovery.md): Interrupted work without duplicate effects or data loss.
- [Isolation](cli/isolation.md): Optional worktrees and integration.
- [Task traces](cli/traces.md): Literal task-file basenames, source/name provenance, harness evidence, video and redaction.
- [Trace configuration](cli/trace-configuration.md): Independent recording and Git/video-inclusion choices.
- [Planning](cli/planning.md): Read-only discussion and approved task saving.
- [Migration](cli/migration.md): Lossless Markdown-to-Book and legacy-header conversion.
- [Operational quality](cli/operations.md): Cross-platform, bounded and observable operation.
- [Acceptance scenarios](cli/acceptance.md): Verifiable outcomes, supplemented by focused topic acceptance.
