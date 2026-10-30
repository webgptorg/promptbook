# Promptbook (`ptbk`)

Promptbook is one npm package, `ptbk`, providing the `ptbk` command-line utility. It operates a Git-backed project of three Book entities: **agents**, **tasks** and **chats**. Canonical Books start with `AGENT <name>`, `TASK <name>` or `CHAT <name>` and share commitment syntax. Normalized opening-name content is logical identity, not a generated ID or filename key. System-created task/chat names include readable creation date/time without mandatory timestamp grammar. `chats/` holds conversations, Git-versioned `ptbk.json` holds configuration, ignored `.ptbk/` holds runtime state and `traces/<task-file-basename>/` holds evidence under the literal source filename without final `.book` or legacy `.md`.

## Core operating principles

**Automatic repair and useful unattended operation are foundational.** The engine's [autonomy and minimal-interruption principle](concepts/engine-and-project.md#autonomous-operation-and-minimal-interruption) targets sustained useful unattended work, including a year-long agenda: attention is exceptional, a response clears its question promptly, and one waiting operation does not stop independent work. A started project should progress authorized work and solve routine problems with as little unnecessary user involvement as possible. Completed setup with required access should suffice without later routine dashboard configuration. Agents adapt authorized service/interface workflows and recurring sends/submissions without repeated approval. Cause-aware bounded retry bursts lead to autonomous repair or scheduled rechecks, never a generic human Retry question merely because a counter expired; unresolved/judgment-dependent problems go to the ordinary editable OPEN **Fixer**. Its simple initial Book aims to solve general problems and offload decisions, with User and Expert in its team. Consultation and learning are normal agent mechanisms. Users may customize all/some/no-User consultation; no special Fixer channel, privileged worker or hardcoded escalation policy is introduced. See [automatic repair](concepts/automatic-repair.md), [Fixer](agents/core-agents/fixer.md) and [unattended operation](cli/autonomous-operation.md).

Every engine owns one concrete project directory; exclusive locking prevents two local owners across installations. It runs with zero or many observing clients and contains coherent internal **sub-engines** rather than another global worker. Health is exactly one sub-engine per project engine; browser/harness domains may manage multiple named resources. Shared lifecycle states remain **running, pausing, pause and stopping**. Pause/ordinary stop drain without new claims; pending intent can be cancelled/changed. Force stop is immediate with best-effort owner cleanup; external hard kill has no cleanup guarantee. Enabled persistence restores all still-registered services at OS reboot: prior running/Health-only agendas may work after current checks, while manual/combined pause, stop, force stop and panic outcomes start directly paused before any task claim. Unexpected disappearance/ambiguous external kill never authorizes automatic work resumption; any recovered service is paused. Stop/panic still ends the current process and prevents immediate replacement. `ptbk start --paused` exposes the same availability-without-queued-work policy; no-persist/foreground opt-outs remain honored. A dashboard is a lightweight cockpit/view/controller, never an independent scheduler: opening/closing one does not start/stop the engine. A running engine can legitimately wait for tasks or tools without being technically paused or stopped. Pause is composed from independent reasons: initial reasons are manual and Health; future domains may add more. Generic Resume removes manual intent only and scheduling resumes only after all reasons clear. Health soft incidents may be overridden for that incident; hard actual resource exhaustion cannot. Pause blocks automatic new background work; chat, its necessary routing/consultations and task authoring remain available. Tasks authored during pause wait for resume.

**Configuration and Books evolve through one deterministic project migration mechanism.** `promptbookVersion` records the initializing/last-migrating engine version. Compare semantic versions, including numeric prereleases. An older engine offers its update without downgrading the project. A newer one applies applicable sparse steps to configuration and affected Books in order, then sets its version and commits the entire migration pass once, even with no transformation steps. No per-Book age detection or migration agent is introduced, including for an older Book later imported into a current project. Missing version means one fixed pre-versioning baseline, without structural age analysis. The first migration converts separate browser/harness settings into named [tools](cli/tools.md). See [configuration migrations](cli/configuration-migrations.md) and [first conversion](cli/tools-migration.md).

**Tools are pluggable named project resources, not additional Book entities.** Ordered `tools` records have `type`, `variant`, required `name`, optional `description` and `isEnabled` (default true). Initial types are BROWSER and HARNESS, with variant-specific typed settings. Multiple browser profiles/accounts and harness instances are supported. Different harness variants can be chosen for suitability; same-variant instances form an ordered availability/quota fallback chain. API keys are symbolic `${{ env.NAME }}` references, never committed values. Shared safe `.env` editing preserves historical assignments and adds timestamp/reason comments.

Init, CLI and dashboard use **one shared implementation** of tool types, validation, management, secret editing and persistence. Saved tool changes commit immediately and independently from active task edits. Enable/disable is primary, permanent removal secondary. In-use changes require the shared acknowledgement: tool `--force` preserves already acquired work, while the separate `ptbk stop --force` terminates the whole engine without deleting a tool. Last-enabled-type removal/disable needs its own warning/confirmation. Configuration/env/readiness refresh before tasks and during work/waits; newly available tools may serve the current task, not only the next one. See [DRY](coding-standards/shared-logic.md), [management](cli/tool-management.md) and [live tool use](cli/tool-runtime.md).

**Git history is an audit trail.** Authorized versioned operations commit by default with lowercase `ptbk: `, the responsible agent's backtick-quoted textual visual for actual agent work and applicable name correlation. System commits invent no agent or extra date. External task mutations have durable [action records](cli/action-log.md): one Markdown file per remote action under `actions/<task-file-basename>/`, versioned independently of traces and task success. Reads/downloads are excluded, no-action tasks create no directory, and old tasks are not backfilled. Reconcile uncertain effects before retry; Git revert does not undo them. Other meaningful operations without eligible files can use an empty audit commit. [Storage and Git](cli/storage-and-git.md) is the entry point for storage classes and audit boundaries. Tasks, human-facing messages, tool changes, normalization and whole migration passes have their proper separate boundaries. Accepted messages/files are saved immediately; compatible conversational writes use bounded smart/debounced commits instead of one commit per message. Preserve user edits made during work to the affected files in the resulting scoped commit. No blanket staging, history rewriting or accidental secret commits. Optional `isAutoSync` defaults false and uses the repository's configured origin and started branch without duplicated JSON destination settings. Enabled sync attempts pull every 60 seconds and before logical mutations/commits, then publishes completed local work. Failed remote operations do not stop safe local work; preserve dirty state and defer unsafe integration. Real integrations use visible non-fast-forward merges, with judgment-dependent conflicts routed through ordinary Fixer. See [persistence](cli/git-persistence.md) and [synchronization](cli/git-synchronization.md).

**Wallet mediates website login without disclosing credentials to agents.** Each project engine owns a [Wallet sub-engine](cli/wallet.md), separate from Book entities and named tools. Already signed-in sessions are reused; missing authentication uses stored credentials/TOTP automatically or one continuing protected Wallet workflow through verified access. Saving a password is not login success. Technical updates are autonomous; genuinely needed human input uses Wallet's own notice. Nonsecret Wallet mutation audits default on and may be disabled. Its ignored project-local ciphertext uses [project encryption](cli/project-encryption.md): 12 recovery words on first use, protected host automatic unlock on ordinary reboot and one restoration step on another host. Complete Wallet records are encrypted, including service/account metadata, without a plaintext index. Shared [Bitwarden import](cli/wallet-import.md) is available in Wallet and optional init with individual/all/none selection. With a usable decryption key, [new recovery words](cli/wallet-recovery.md) preserve/re-encrypt all contents; total key loss allows only a strongly warned explicitly confirmed empty reset directly in Wallet. Only Wallet credentials are encrypted now; no cryptocurrency/standard jargon appears in product UI. Browser processes [pool connections per actual profile](cli/browser.md), start with the engine and close after the last managed connection; no master/slave engine. Shared-session interference is explicitly [known and deferred](cli/known-limitations.md).

## Initialization, work and cockpit

Initialization is finite attended technical setup. After intent, destination choices are shared `<user-home>/PTBK/project/<project>` first, current directory second and a new subfolder third. OS-aware home resolution keeps the original user's scope under sudo and root's scope for a direct root launch. Global CLI use is preferred, installed-ready harnesses are preselected and optional Wallet setup defaults No. Blank intent retains useful noncore-agent boilerplate; nonblank intent creates relevant specialists through the normal first task. Init/start share missing-core preparation and three-way template updates, with conflicts handled by Fixer before any necessary user decision. Its first new-project input is intent, preserved verbatim with linked assets in the initialized project's `specs/_initial.md`. It prepares missing core roles and simple selected tools, saves one ordinary Expert bootstrap, commits setup by default and starts the background agenda. It does not expose advanced account-pooling choices or execute the bootstrap inline. The check-command question is removed: preserve real checks or create an explicit nonblocking informational placeholder, never claim it is actual validation. Add optional autosync setup: no asks nothing further; yes offers private-by-default GitHub publication or another supplied origin. New repositories use main; existing branch/history are preserved. Remote failure is separate from ready local work.

Init shows progress, Expert as visual guide and a brief truthful celebration, then ordinary interactive use automatically hands off (optionally through the short cancellable countdown) to the independent dashboard. `--no-dashboard`, raw/no-UI/noninteractive use returns directly; no mode waits for task completion. Ordinary interactive daemon `ptbk start` and successful `ptbk restart` likewise attach the project dashboard by default, including idempotent start of an already-running engine. Bare interactive `ptbk` offers exactly two choices: the focused default is init for an uninitialized directory, start for an initialized stopped project, or dashboard for an initialized project with an active engine; technical help is always second. About is a compact product/version/web box. Tasker creates/manages tasks; Router chooses agents and specializes one shared [MODEL](book-language/commitments/model.md) within agent/task constraints, committing the refinement with earlier values only in Git. Plugin code owns model/thinking defaults; named tools own connection/authentication/endpoint setup. Ongoing work uses a shared configurable limit of five active task/chat units by default, coordinated per file in one working tree/current branch. Independent work progresses concurrently; conflicting file edits wait. Each executing agent holds only one started unfinished task, including while waiting, but can still answer chat under shared capacity. It handles follow-ups and discovers useful goal-driven work when no backlog remains. See [concurrency](cli/concurrency.md) and the deliberately deferred [known limitations](cli/known-limitations.md). Ordinary `--no-commit` workflows remain explicit exceptions, not permission to silently bypass required committed configuration evolution or saved tool management. `ptbk run` is removed; `ptbk start` is the ongoing work launcher.

Chatter is the project’s **spokesperson**, maintaining [project briefs](cli/project-report.md) through ordinary periodic/significant-event work independently of viewers. Root `report.book` is undated `CHAT Report` with Chatter alone, appending every timestamped brief without cleanup or overwriting. Dashboard/status immediately read only the last complete parsed message. Explicit Refresh coalesces shared generation subject to pause/capacity; Discuss creates a new ordinary `chats/` thread with the exact displayed first Chatter snapshot. Reading never generates work; see [presentation](cli/project-report-ui.md).

The project dashboard root is a responsive **no-scroll home screen** with a prominent shared full-width Promptbook/PTBK and project identity and full-width brief (lifecycle state stays in the tiles) above its compact tile grid. Operational domains include Current work, System, Health, Tools, Wallet, Agents, Chats, Tasks, Results/Activity, Usage, Action log, History, Files, Connection and enabled Synchronization. Arrows move focus, marked by a double border/bold heading without changing geometry; attention is independent and may transiently blink/pulse without stealing focus. Enter opens a full dashboard page (the root grid disappears), pages may scroll, and Escape returns; root Escape exits only the viewer. Complete task views use smart current-work ordering and user-selected sorting, independently of engine scheduling. Project Book sources are editable with shared rich input, nonblocking warnings and ordinary Fixer repair. Viewing/editing share one [Book core](cli/book-viewer.md) that handles very long sources. [History](cli/history.md) reads Git messages/topology and [Files](cli/files.md) is read-only confined browsing with formatted Markdown/JSON/Book and supported images; video playback is deferred. The same tile/drill-down hierarchy continues inside Tools and Health. Details use consistent keyboard-accessible drill-down for actual execution context, named-tool management and browser diagnosis. Terminal rendering coalesces obsolete frames under hidden/slow-output conditions without losing durable events or blocking the engine. **A synchronization panel, its details and manual Synchronize now action exist only while autosync is enabled.** Browser repair and synchronization call shared engine operations; clients do not duplicate business logic. Technical detail lives on pages while significant blockers remain summarized/attention-marked on the home screen. System owns manual lifecycle controls and pause reasons; Health is only the UI over the per-engine Health sub-engine. Terminal, lightweight browser SPA and independently usable API control the same service. Dashboard/API access is loopback-only, with local client authentication and same-origin safeguards. Git autosync remains a separate opt-in.

`ptbk dashboard --global` is a separate refreshed host-wide table of known projects, including stopped ones, across installations/versions and independent of CWD. Entries survive stop/reboot; the view stays open at zero entries and attaches to selected live engines without cd or startup. Explicit individual/bulk Start, Start paused, Stop, Force stop, Pause and Resume call shared operations. Individual/bulk removal forgets only verified stopped entries, preserving project data. `ptbk panic` confirms (or accepts `--yes`) and immediately force-stops accessible local engines and owned execution, leaving them registered and stopped now, with enabled next-boot startup paused without tasks; no soft/pause variants exist. There is no global engine. Ordinary project dashboard entry still diagnoses a missing service actionably.

Chat primarily coordinates, checks status and creates/manages tasks; substantial execution belongs to tasks, with live cards, questions and results in the originating chat through [named links](cli/chat-tasks.md). Progress collapses after the final reply to Thinking plus elapsed duration. Appended CHAT TITLE changes presentation without identity changes. Human-facing chats support multiple agents with actual authorship and question/mention/main-agent routing.

[Raw usage](cli/usage.md) is durable fine-grained evidence, stored separately from harness output/video and from independent historical price observations. Retain executing agent, owner, initiator, work hierarchy, actual tool/model/account, time and available token categories. Self/inclusive views must not double-count project totals. Calculate with prices valid at consumption time; later price reductions do not change earlier rates. Historical price snapshots and aggregate caches may remain ignored; no complex automatic repricing mechanism is required. The simple Usage view defaults to seven days, may remember its last grouping and visibly distinguishes subscription/API and certain/estimated/unknown data. Price version/timestamp internals stay hidden.

[Book layering](book-language/layering.md) explains progressive source evolution. New chats are implicitly open without an initial status line; status/title changes and participant joins are appended chronologically, preserving their positions and history. The last valid status/title is effective, without making every Book universally append-only.

Chatter is the editable core default for human-led project conversation. New chat first offers Chatter (Enter) or another agent; only the latter expands all valid targets. Initial TEAM includes the other initialized roles; specialist advice and execution use normal consultation/tasks. Existing chats/questions retain their real authors. Human-facing messages persist immediately and use debounced scoped commits; task-internal consultations retain result attribution, and conversation-only consultations use scoped authoring persistence.

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
- [Browser](cli/browser.md): Profile connection pools, task tabs, lifecycle, diagnostics and shared restart/kill/test actions.
- [Wallet](cli/wallet.md): Project login sub-engine, automatic credential use and protected human input.
- [Project encryption](cli/project-encryption.md): Full-record encryption, recovery words and unattended protected host unlock.
- [Wallet import](cli/wallet-import.md): Shared extensible Bitwarden import in init/Wallet with individual/all/none selection.
- [Wallet recovery management](cli/wallet-recovery.md): Preserve records with new words if a key remains, or explicitly reset empty after total key loss.
- [Harnesses](cli/harnesses.md): Global executables, named authentication contexts, capabilities and authorized fallback.
- [Remote harness authentication](cli/harness-authentication.md): Native Codex/Claude terminal login without a VPS browser, attended code/URL handling and service-user readiness.
- [Harness adapters](cli/harness-plugins.md): Common typed setup/execution/evidence contracts and featured/More catalog.
- [Harness updates](cli/harness-updates.md): Selected shared installations and safe maintenance.

## Installation and operation

The Windows installer is an additional release artifact, not a second engine or a replacement for npm. It prepares missing prerequisites, installs the corresponding `ptbk` version and hands an ordinary user-owned project to the existing interactive init.

- [Installation](cli/installation.md): Global/local package, prerequisite bootstraps, matching README/web guidance and local/VPS AI installation prompts.
- [VPS onboarding](cli/vps-onboarding.md): One shell command from a clean supported server into ordinary interactive init, with the engine user's terminal and private persistent operation.
- [Windows installer](cli/windows-installer.md): Thin prerequisite bootstrap, home-based first project and automatic terminal/init handoff.
- [Checks and publication on GitHub Actions](cli/releasing.md): Required hosted validation, npm publication and matching Windows release artifact.
- [Engine updates](cli/updates.md): Invoked installation, compatibility gate, preserved setup input and rerun.
- [Commands](cli/cli.md): Command surface/options, named tools, lifecycle and global dashboard.
- [Storage and Git guide](cli/storage-and-git.md): Primary data, caches, secret stores, logical/empty audit commits and disableable Wallet audit.
- [Raw usage and pricing](cli/usage.md): Fine-grained evidence, work attribution, independent historical rates and lightweight cost views.
- [Progressive Book layering](book-language/layering.md): Evolving Books and chronological chat transitions.
- [Workspace](cli/workspace.md): Source/specification/trace/runtime locations and external discovery metadata.
- [Initialization](cli/initialization.md): Intent preservation, simple tool setup, check placeholder and background start.
- [Initialization synchronization setup](cli/synchronization-setup.md): Opt-in GitHub/custom-origin publication, private default and local/remote outcome separation.
- [First runnable task](cli/first-task.md): Ordinary Expert bootstrap, without a duplicate starter or inline implementation phase.
- [Nested projects](cli/nested-projects.md): Explicit child Git boundaries.
- [Start](cli/start.md): Automatic progression, running resource waits and default interactive dashboard handoff.
- [Unattended operation](cli/autonomous-operation.md): Sustained authorized work and ordinary automatic repair.
- [Process modes](cli/process-modes.md): Engine placement and independent clients.
- [Sub-engines](cli/sub-engines.md): Per-engine runtime domains and UI/domain ownership boundaries.
- [Health sub-engine](cli/health-sub-engine.md): Host resources, health incidents, pause reasons and remediation.
- [Service lifecycle](cli/service-lifecycle.md): Four states, draining, cancellation, restart, force stop and signals.
- [Project locking](cli/locking.md): One local engine owner and controlled cleanup.
- [Startup persistence](cli/persistence.md): Service availability and running-versus-paused work intent across operating-system restarts.

## Controls and interaction

- [CLI presentation](cli/interactive-ui.md): Pretty/raw, finite wizards, live views and one-shot results.
- [Initialization experience](cli/initialization-ui.md): Intent-first progress, simple choices, conditional sync and Expert guide.
- [Rich composer](cli/rich-input.md): One DRY implementation for init, chat and Book editing, with multiline input, rich paste and preserved attachments.
- [Book source editor](cli/book-editor.md): Enter/newline, Ctrl+S/save without closing, nonblocking warnings and ordinary Fixer repair.
- [Task views](cli/task-views.md): All tasks, smart default order, arbitrary sorting and Tasker-first authoring.
- [Help, about and version](cli/help.md): Scoped help and actual invoked/running version.
- [Shared controls](cli/controls.md): One engine/domain model for saved tools, runtime operations and sync.
- [Shared project status](cli/status-view.md): Live/snapshot cockpit, saved brief, waits and connection data.
- [Project report](cli/project-report.md): Chatter’s append-only report, independent generation and new seeded discussions.
- [Report presentation](cli/project-report-ui.md): Full-width brief, explicit shortcuts and one-shot status.
- [History](cli/history.md): Git messages/topology and verified project links.
- [Files](cli/files.md): Confined read-only project browser.
- [Book viewing](cli/book-viewer.md): Shared viewer/editor core and responsive long documents.
- [Dashboard layout](cli/dashboard-layout.md): Main regions and consistent drill-down hierarchy.
- [Dashboard details](cli/dashboard-details.md): Execution, tool management, per-browser diagnostics and conditional synchronization.
- [Terminal dashboard](cli/terminal.md): Independent attachment and keyboard controls.
- [Terminal titles](cli/terminal-title.md): Self-naming tab/window titles, TTY gating, sanitization and opt-out.
- [Global dashboard](cli/global-dashboard.md): Durable known-project registry, stopped entries, individual/bulk lifecycle controls and registry-only removal.
- [Emergency stop](cli/panic.md): Confirmed host-wide force stop, owned-process termination and durable suppression of automatic work resumption.
- [Service API](cli/api.md): Independent authenticated state/control and shared management operations.
- [Browser dashboard](cli/dashboard.md): Lightweight JavaScript SPA using the same API.
- [Chats](cli/chats.md): Responsive multi-agent conversations, stable names, evolving titles and debounced persistence.
- [Chat/task relationships](cli/chat-tasks.md): Task-first heavy work, source links, live cards, questions and results.
- [Chat UI](cli/chat-ui.md): Chatter-first entry, existing threads and unread/actionable state.
- [Human interactions](cli/user-interactions.md): Ordinary attributed questions and once-only replies.
- [Channels](cli/channels.md): Terminal, CLI, browser and API.

## Agents and work

- [Anchoring](concepts/anchoring.md): User-fixed meaning and learning boundaries within autonomous project evolution.
- [System agents](agents/system-agents.md): Engine-owned references, distinct from editable core/content agents.
- [Ordinary and system tasks](cli/system-tasks.md): Shared scheduling, inventory and runs without a separate core-task category.
- [Agent context](cli/agent-context.md): Effective role, task and project instructions.
- [Agent visual identity](agents/visual-identity.md): Mascots, name identity and truthful activity.
- [Router](agents/core-agents/router.md): Ordinary assignment, concrete bootstrap, priority-aware future routing and first-message chat routing.
- [Tasker](agents/core-agents/tasker.md): Task authoring/maintenance and exceptional MODEL removal through editable instructions.
- [Chatter](agents/core-agents/chatter.md): Project spokesperson, briefs, default conversation, TEAM and ordinary delegation.
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
- [Retries](cli/retries.md): Cause-aware recovery beyond bounded immediate attempts, authorized fallback and durable waits.
- [External actions](cli/action-log.md): Versioned records of remote mutations and reconciliation before retry.
- [Action log page](cli/action-log-ui.md): External-effect history with verified task/evidence links.
- [Git preflight](cli/git-preflight.md): Safe setup, existing history and main for a new repository.
- [Git persistence](cli/git-persistence.md): Scoped/interleaved operations, immutable history and evidence inclusion.
- [Git synchronization](cli/git-synchronization.md): Opt-in 60-second/boundary attempts, visible merges and independent local progress.
- [Recovery](cli/recovery.md): Interrupted work without duplicate effects or data loss.
- [Concurrency](cli/concurrency.md): Shared task/chat limit, one working tree, per-file ownership and durable immediate saves.
- [Isolation](cli/isolation.md): Shared-working-tree mutation isolation; task worktrees and `--isolate` are removed.
- [Known limitations](cli/known-limitations.md): Explicitly acknowledged issues deferred from this version.
- [Task traces](cli/traces.md): Literal source basenames, provenance, available output, video and redaction.
- [Trace configuration](cli/trace-configuration.md): Independent recording and Git/video choices.
- [Planning](cli/planning.md): Read-only discussion and approved task saves.
- [Book conversion](cli/migration.md): Lossless Markdown/legacy-header transformations through the shared project migration mechanism.
- [Operational quality](cli/operations.md): Cross-platform, bounded, observable operation.
- [Acceptance scenarios](cli/acceptance.md): Existing and new verifiable outcomes, supplemented by topic-specific acceptance.
