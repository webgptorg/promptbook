# Promptbook (`ptbk`)

Promptbook is one npm package, `ptbk`, providing the `ptbk` command-line utility. It operates a Git-backed project of three Book entities: **agents**, **tasks** and **chats**. Canonical Books start with `AGENT <name>`, `TASK <name>` or `CHAT <name>` and share commitment syntax. Normalized opening-name content is logical identity, not a generated ID or filename key. System-created task/chat names include readable creation date/time without mandatory timestamp grammar. `chats/` holds conversations, Git-versioned `ptbk.json` holds configuration, ignored `.ptbk/` holds runtime state and `traces/<task-file-basename>/` holds evidence under the literal source filename without final `.book` or legacy `.md`.

## Core operating principles

**Automatic repair and useful unattended operation are foundational.** A started project should progress authorized work and solve routine problems with as little unnecessary user involvement as possible. Deterministic corrections and bounded retries handle obvious cases; unresolved/judgment-dependent problems go to the ordinary editable OPEN **Fixer**. Its simple initial Book aims to solve general problems and offload decisions, with User and Expert in its team. Consultation and learning are normal agent mechanisms. Users may customize all/some/no-User consultation; no special Fixer channel, privileged worker or hardcoded escalation policy is introduced. See [automatic repair](concepts/automatic-repair.md), [Fixer](agents/core-agents/fixer.md) and [unattended operation](cli/autonomous-operation.md).

Every engine owns one concrete project directory; exclusive locking prevents two local owners across installations. It runs with zero or many observing clients. Shared lifecycle states remain **running, pausing, pause and stopping**. Pause/ordinary stop drain without new claims; pending intent can be cancelled/changed. Force stop is immediate with best-effort owner cleanup; external hard kill has no cleanup guarantee. A dashboard is a lightweight cockpit/view/controller, never an independent scheduler: opening/closing one does not start/stop the engine. A running engine can legitimately wait for tasks or tools without being technically paused or stopped. Pause blocks automatic new background work; chat, its necessary routing/consultations and task authoring remain available, including beside other task execution. Tasks authored during pause wait for resume.

**Configuration and Books evolve through one deterministic project migration mechanism.** `promptbookVersion` records the initializing/last-migrating engine version. Compare semantic versions, including numeric prereleases. An older engine offers its update without downgrading the project. A newer one applies applicable sparse steps to configuration and affected Books in order, then sets its version and commits the entire migration pass once, even with no transformation steps. No per-Book age detection or migration agent is introduced, including for an older Book later imported into a current project. Missing version means one fixed pre-versioning baseline, without structural age analysis. The first migration converts separate browser/harness settings into named [tools](cli/tools.md). See [configuration migrations](cli/configuration-migrations.md) and [first conversion](cli/tools-migration.md).

**Tools are pluggable named project resources, not additional Book entities.** Ordered `tools` records have `type`, `variant`, required `name`, optional `description` and `isEnabled` (default true). Initial types are BROWSER and HARNESS, with variant-specific typed settings. Multiple browser profiles/accounts and harness instances are supported. Different harness variants can be chosen for suitability; same-variant instances form an ordered availability/quota fallback chain. API keys are symbolic `${{ env.NAME }}` references, never committed values. Shared safe `.env` editing preserves historical assignments and adds timestamp/reason comments.

Init, CLI and dashboard use **one shared implementation** of tool types, validation, management, secret editing and persistence. Saved tool changes commit immediately and independently from active task edits. Enable/disable is primary, permanent removal secondary. In-use changes require the shared acknowledgement: tool `--force` preserves already acquired work, while the separate `ptbk stop --force` terminates the whole engine without deleting a tool. Last-enabled-type removal/disable needs its own warning/confirmation. Configuration/env/readiness refresh before tasks and during work/waits; newly available tools may serve the current task, not only the next one. See [DRY](coding-standards/shared-logic.md), [management](cli/tool-management.md) and [live tool use](cli/tool-runtime.md).

**Git history is an audit trail.** Authorized versioned operations commit by default with `PTBK: ` and applicable name correlation. Tasks, human-facing messages, tool changes, normalization and whole migration passes have their proper separate boundaries. No blanket staging, history rewriting or accidental secret commits. Optional `isAutoSync` defaults false and uses the repository's configured origin and started branch without duplicated JSON destination settings. Enabled sync attempts pull every 60 seconds and before logical mutations/commits, then publishes completed local work. Failed remote operations do not stop safe local work; preserve dirty state and defer unsafe integration. Real integrations use visible non-fast-forward merges, with judgment-dependent conflicts routed through ordinary Fixer. See [persistence](cli/git-persistence.md) and [synchronization](cli/git-synchronization.md).

## Initialization, work and cockpit

Initialization is finite attended technical setup. Its first new-project input is intent, preserved verbatim with linked assets in the initialized project's `specs/_initial.md`. It prepares missing core roles and simple selected tools, saves one ordinary Expert bootstrap, commits setup by default and starts the background agenda. It does not expose advanced account-pooling choices or execute the bootstrap inline. The check-command question is removed: preserve real checks or create an explicit nonblocking informational placeholder, never claim it is actual validation. Add optional autosync setup: no asks nothing further; yes offers private-by-default GitHub publication or another supplied origin. New repositories use main; existing branch/history are preserved. Remote failure is separate from ready local work.

Init shows progress, Expert as visual guide and a brief truthful celebration, then interactive use hands off after a short cancellable countdown to the ordinary independent dashboard. Raw/noninteractive use returns directly; no mode waits for task completion. Bare interactive `ptbk` offers init/start/dashboard, technical help is explicit and about is a compact product/version/web box. Tasker creates/manages tasks; Router chooses agents and specializes one shared [MODEL](book-language/commitments/model.md) within agent/task constraints, committing the refinement with earlier values only in Git. Plugin code owns model/thinking defaults; named tools own connection/authentication/endpoint setup. Ongoing work executes one queued background task at a time, handles follow-ups and discovers useful goal-driven work when no backlog remains. Ordinary `--no-commit` workflows remain explicit exceptions, not permission to silently bypass required committed configuration evolution or saved tool management. `ptbk run` is removed; `ptbk start` is the ongoing work launcher.

The project dashboard is a cockpit with compact attention, work, visible lifecycle controls, tools, separate Agents/Chats/Tasks panels, results and connection regions. Arrows highlight panels without enlarging them; Enter drills in and Escape returns, exiting only the viewer at the root. Complete task views use smart current-work ordering and user-selected sorting, independently of engine scheduling. Project Book sources are editable with shared rich input, nonblocking content warnings and ordinary Fixer repair. Details use consistent keyboard-accessible drill-down for actual execution context, named-tool management and browser diagnosis. **A synchronization panel, its details and manual Synchronize now action exist only while autosync is enabled.** Browser repair and synchronization call shared engine operations; clients do not duplicate business logic. Technical detail is collapsed initially while significant blockers remain visible. Terminal, lightweight browser SPA and independently usable API control the same service. Protected remote dashboard access defaults on with HTTP; `--no-tunnel` keeps it local and is unrelated to Git autosync.

`ptbk dashboard --global` is a separate refreshed host-wide table of running engines, across installations/versions and independent of CWD. It stays open at zero entries and attaches to a selected project without cd or starting work. There is no global engine. Ordinary project dashboard entry still diagnoses a missing service actionably.

Chatter is the editable core default for human-led project conversation. New chat first offers Chatter (Enter) or another agent; only the latter expands all valid targets. Initial TEAM includes the other initialized roles; specialist advice and execution use normal consultation/tasks. Existing chats/questions retain their real authors. Human-facing messages commit individually, task-internal consultations with their result, and conversation-only consultations through scoped authoring persistence.

Logical task identity, Git/source provenance and evidence location remain distinct. Trace directories exactly match source basenames, not normalized TASK names or opaque IDs. Evidence preserves declared names, revisions, actual tool instances, available harness output/events and enabled attributable browser recording. Init saves independent trace-commit, video-ignore and recording choices; runtime, secret stores and browser sessions stay ignored regardless.

## Reading this specification

These files define target behavior, **not a claim that implementation or tests already meet it**. The [whitepaper](whitepaper.md) explains APT principles and explicitly long-term directions; those do not implicitly become current requirements.

Keep specifications in English, concise and focused on observable behavior, important contracts and invariants. Internal representations/algorithms/module layout remain implementation choices unless explicitly necessary, such as the shared typed tool contract and prohibition of duplicated domain logic. Separate functional behavior from presentation and cross-link rather than copying full rules.

[Product presentation](concepts/product-presentation.md) · [Project model](concepts/project-model.md) · [Engine/project evolution](concepts/engine-and-project.md) · [Automatic repair](concepts/automatic-repair.md) · [Coding standards](coding-standards/_index.md) · [Naming](coding-standards/naming.md) · [Shared logic and DRY](coding-standards/shared-logic.md) · [Dictionary](dictionary.md)

[Agents](agents/_index.md) · [Book language](book-language/_index.md) · [References and lookup](book-language/references.md) · [Commitment index](book-language/commitments/_index.md)

## Configuration and tools

- [Configuration](cli/configuration.md): Versioned defaults, explicit overrides, live refresh and persistence boundaries.
- [Project migrations](cli/configuration-migrations.md): One deterministic configuration/Book mechanism, fixed versionless baseline, sparse ordered steps and one committed pass.
- [Routing/model conversion](cli/routing-migration.md): Preserve Manager customization and consolidate former execution controls into MODEL.
- [First tools migration](cli/tools-migration.md): Preserve existing browser/harness choices, canonical spellings and autosync off.
- [Tools](cli/tools.md): Named typed resources, multiple accounts/profiles and ordered same-variant fallback.
- [Tool management](cli/tool-management.md): Shared CLI/init/dashboard operations, immediate commits and confirmations.
- [Live tool use](cli/tool-runtime.md): Continuous readiness, current-task additions and retained acquired uses.
- [Environment references and editing](cli/environment.md): Symbolic secrets, non-destructive changes and local audit history.
- [Browser](cli/browser.md): Per-instance profile sources, account-aware selection, ownership and recovery.
- [Harnesses](cli/harnesses.md): Global executables, named authentication contexts, capabilities and authorized fallback.
- [Harness adapters](cli/harness-plugins.md): Common typed setup/execution/evidence contracts and featured/More catalog.
- [Harness updates](cli/harness-updates.md): Selected shared installations and safe maintenance.

## Installation and operation

The Windows installer is an additional release artifact, not a second engine or a replacement for npm. It prepares missing prerequisites, installs the corresponding `ptbk` version and hands an ordinary user-owned project to the existing interactive init.

- [Installation](cli/installation.md): Global/local package, Windows entry point and destination-specific dependency setup.
- [Windows installer](cli/windows-installer.md): Thin prerequisite bootstrap, home-based first project and automatic terminal/init handoff.
- [Checks and publication on GitHub Actions](cli/releasing.md): Required hosted validation, npm publication and matching Windows release artifact.
- [Engine updates](cli/updates.md): Invoked installation, compatibility gate, preserved setup input and rerun.
- [Commands](cli/cli.md): Command surface/options, named tools, lifecycle and global dashboard.
- [Workspace](cli/workspace.md): Source/specification/trace/runtime locations and external discovery metadata.
- [Initialization](cli/initialization.md): Intent preservation, simple tool setup, check placeholder and background start.
- [Initialization synchronization setup](cli/synchronization-setup.md): Opt-in GitHub/custom-origin publication, private default and local/remote outcome separation.
- [First runnable task](cli/first-task.md): Ordinary Expert bootstrap, without a duplicate starter or inline implementation phase.
- [Nested projects](cli/nested-projects.md): Explicit child Git boundaries.
- [Start](cli/start.md): Automatic progression, running resource waits and one-shot launch output.
- [Unattended operation](cli/autonomous-operation.md): Sustained authorized work and ordinary automatic repair.
- [Process modes](cli/process-modes.md): Engine placement and independent clients.
- [Service lifecycle](cli/service-lifecycle.md): Four states, draining, cancellation, restart, force stop and signals.
- [Project locking](cli/locking.md): One local engine owner and controlled cleanup.
- [Startup persistence](cli/persistence.md): Recovery across operating-system restarts.

## Controls and interaction

- [CLI presentation](cli/interactive-ui.md): Pretty/raw, finite wizards, live views and one-shot results.
- [Initialization experience](cli/initialization-ui.md): Intent-first progress, simple choices, conditional sync and Expert guide.
- [Rich composer](cli/rich-input.md): One DRY implementation for init, chat and Book editing, with multiline input, rich paste and preserved attachments.
- [Book source editor](cli/book-editor.md): Enter/newline, Ctrl+S/save without closing, nonblocking warnings and ordinary Fixer repair.
- [Task views](cli/task-views.md): All tasks, smart default order, arbitrary sorting and Tasker-first authoring.
- [Help, about and version](cli/help.md): Scoped help and actual invoked/running version.
- [Shared controls](cli/controls.md): One engine/domain model for saved tools, runtime operations and sync.
- [Shared project status](cli/status-view.md): Live/snapshot cockpit, truthful waits and connection data.
- [Dashboard layout](cli/dashboard-layout.md): Main regions and consistent drill-down hierarchy.
- [Dashboard details](cli/dashboard-details.md): Execution, tool management, per-browser diagnostics and conditional synchronization.
- [Terminal dashboard](cli/terminal.md): Independent attachment and keyboard controls.
- [Terminal titles](cli/terminal-title.md): Self-naming tab/window titles, TTY gating, sanitization and opt-out.
- [Global dashboard](cli/global-dashboard.md): Host-wide live discovery/table and project attachment.
- [Service API](cli/api.md): Independent authenticated state/control and shared management operations.
- [Browser dashboard](cli/dashboard.md): Lightweight JavaScript SPA using the same API.
- [Remote access](cli/remote-access.md): Protected tunnel, pairing, opt-out and lifetime.
- [Tunnel provider decision](cli/tunnel-options.md): Alternatives and stable-hostname tradeoffs.
- [Chats](cli/chats.md): Durable named conversations, attribution and commit boundaries.
- [Chat UI](cli/chat-ui.md): Chatter-first entry, existing threads and unread/actionable state.
- [Human interactions](cli/user-interactions.md): Ordinary attributed questions and once-only replies.
- [Channels](cli/channels.md): Terminal, CLI, browser and API.

## Agents and work

- [Agent context](cli/agent-context.md): Effective role, task and project instructions.
- [Agent visual identity](agents/visual-identity.md): Mascots, name identity and truthful activity.
- [Router](agents/core-agents/router.md): Ordinary assignment, concrete bootstrap, priority-aware future routing and first-message chat routing.
- [Tasker](agents/core-agents/tasker.md): Task authoring/maintenance and exceptional MODEL removal through editable instructions.
- [Chatter](agents/core-agents/chatter.md): Default conversation, initial TEAM and ordinary delegation.
- [Fixer](agents/core-agents/fixer.md): Ordinary editable OPEN problem-solving core and customizable consultation policy.
- [TEAM consultations](cli/team.md): Bounded task- or conversation-scoped specialist advice.
- [Authoring and saving](cli/authoring.md): Commit authorized versioned changes before dispatch.
- [Generated names](cli/generated-names.md): Readable creation time, normalized collisions and separate filenames.
- [Task Books](cli/task-books.md): Bounded work and completion stamps.
- [Markdown tasks](cli/task-markdown.md): Checkmark compatibility sources.
- [Task identity](cli/task-identity.md): Opening name, collisions and provenance separate from trace filenames.
- [Task origins](cli/task-origins.md): Explicit, derived and goal-driven work.
- [Task relationships](cli/task-relationships.md): References, subtasks and prerequisites.
- [Eligibility](cli/eligibility.md): Ready work, assignment candidates and constraints.
- [Goal discovery](cli/goal-discovery.md): Due enquiries without an existing backlog.
- [Earliest start](cli/not-before.md): Time boundaries and timezone.
- [Recurrence](cli/recurrence.md): Repeated occurrences and downtime.

## Results, safety and service workflows

- [Execution](cli/execution.md): Shared task lifecycle, live tools, scoped result and no new claims while draining.
- [Checks](cli/checks.md): Honest placeholder versus real validation and ordinary repairs.
- [Errors](cli/errors.md): Understandable failures, evidence and next actions.
- [Retries](cli/retries.md): Bounded recovery, authorized account fallback and waits.
- [Git preflight](cli/git-preflight.md): Safe setup, existing history and main for a new repository.
- [Git persistence](cli/git-persistence.md): Scoped/interleaved operations, immutable history and evidence inclusion.
- [Git synchronization](cli/git-synchronization.md): Opt-in 60-second/boundary attempts, visible merges and independent local progress.
- [Recovery](cli/recovery.md): Interrupted work without duplicate effects or data loss.
- [Isolation](cli/isolation.md): Optional task worktrees with preserved result commits and visible integration.
- [Task traces](cli/traces.md): Literal source basenames, provenance, available output, video and redaction.
- [Trace configuration](cli/trace-configuration.md): Independent recording and Git/video choices.
- [Planning](cli/planning.md): Read-only discussion and approved task saves.
- [Book conversion](cli/migration.md): Lossless Markdown/legacy-header transformations through the shared project migration mechanism.
- [Operational quality](cli/operations.md): Cross-platform, bounded, observable operation.
- [Acceptance scenarios](cli/acceptance.md): Existing and new verifiable outcomes, supplemented by topic-specific acceptance.
