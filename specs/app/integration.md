# Remote App integration and version-zero scope

[Main specification](../_main.md) · [Project model](../concepts/project-model.md) · [Local API](../cli/api.md) · [VPS onboarding](../cli/vps-onboarding.md) · [Engine updates](../cli/updates.md)

This is the target product contract for integrating the Reborn engine with the Promptbook App. It does not implement remote access, replace the existing local authentication boundary or claim that the platform's current API already matches Reborn. The first release prioritizes one working optimistic path: **App → installation on a VPS → project initialization → autonomous work and chat control**. The terminal dashboard describes the longer-term engine surface, not a requirement to reproduce every page in the first App.

## Ownership and the simple host service

Each project engine owns one concrete project directory, work scheduling, execution, recovery and self-update. A host may run many engines using global and/or project-local installations and different loaded versions. Restart must retain each project's selected installation. The App is an optional client; closing it, signing out, losing a device or losing the relay does not cancel local work or create a periodic confirmation requirement. Apply the [autonomy](../concepts/engine-and-project.md#autonomous-operation-and-minimal-interruption) and [anchoring](../concepts/anchoring.md) principles across the complete integration.

A simple host control service keeps project/process discovery and start/monitor/control available even when an individual engine is stopped. Reuse [host registry](../cli/global-dashboard.md) and lifecycle semantics; do not add a global project engine. The service does not plan project tasks, select releases or make update decisions. It may provide installation/policy/other-process information to the engines. Its own versioning, identity and upgrade mechanism require technical design without moving project/update logic into it.

Projects are the user's primary units. The App need not expose the host service as another mandatory object or grouping. If a server containing twenty projects becomes unreachable, showing twenty unavailable projects is acceptable. Connection ownership, authorization for stopped-project controls and cooperation across installation versions are shared technical-contract work, not already settled endpoint names.

## The first installation and initialization

1. The owner starts in the App. It presents a simple shell command for the owner's VPS.
2. That command prepares the installation and simple control service and pairs the authorized connection with the App. Pairing/registration must preserve the zero-trust boundary below; billing-account association alone is not project authority.
3. Once the service is connected, the App continues the first project's onboarding through the same domain operations as `ptbk init`.
4. Initialize the project, complete selected essential access/tool setup, start its engine and make the project available in the App. Distinguish connection, initialization, authentication and verified launch; none proves the other stages succeeded.

The [attended VPS bootstrap](../cli/vps-onboarding.md) and [remote harness authentication](../cli/harness-authentication.md) remain the shared foundations. The existing standalone shell entry continues its terminal-init handoff. The App-started flow instead has a pending project-init handoff to the App; do not force the owner through a second independent initializer or duplicate intent, Wallet setup, core Books, initial tasks or workers. The concrete installation command and pairing sequence must be agreed with the platform; the existing standalone command is not evidence that App pairing already works.

Keep initial tool setup simple. It must cover the selected harness's real native authentication, including supported ChatGPT/Codex or Claude Code account flows, rather than merely save an API key or mark an executable ready. When an attended step is straightforward to expose in protected App UI, do so; otherwise reuse the CLI/dashboard interaction through the agreed service fallback. Preserve provider consent/URL/code handling, service-user credential storage and actual readiness checks. Never send passwords, returned login codes or tokens as ordinary chat messages or switch native subscription authentication to API billing silently.

Use the ordinary dedicated/default Chrome profile and headless mode on a VPS without a display. The first App needs no browser/profile management UI or remotely controlled browser tab. Browser website authentication and native harness login remain distinct. A selected initial tool that is still awaiting authentication means incomplete setup, not a working agenda. Later native tool-management screens are not a version-zero requirement.

File transfer must work during onboarding through the protected engine connection. Its formats, progress, limits and interrupted-upload recovery need a shared contract. Keep the transport extensible for later files outside onboarding; chat attachments are not required now.

## Required native controls and observed state

The first App natively offers **Start, Pause, Resume, Stop and Restart for the whole project**. These cannot exist only inside a terminal fallback. Controls call the same [lifecycle](../cli/service-lifecycle.md), including pending intent, pause reasons, selected installation, idempotency and truthful completion. A normal Restart is not an update. Force stop is an action if exposed, not another persistent state.

| App presentation | Meaning |
| --- | --- |
| Running | Work is allowed; the engine may be active or legitimately idle. |
| Pausing | The engine is draining background work into pause. |
| Paused | The process remains alive; automatic background work is suspended. Explicit chat, inspection and controls remain available. |
| Stopping | A graceful stop is still in progress. |
| Stopped | Absence/stop has been verified; the host service can explicitly start the project. |
| Health pause | The engine reports a system-caused pause; show it distinctly, with the existing composed reasons when available. |
| Unavailable | The App cannot verify current state. Do not infer a crash, stop or completed command. |

These are presentations, not seven new runtime states. The four live states and pause-reason composition remain canonical. An engine can locally be in Health pause while the App only observes unavailability. Detailed Health diagnostics, graphs, offline work and external outage notifications are not required for the first App; honest unavailability is required. A pending update appears as a [system task](../cli/system-tasks.md), not a mandatory fifth live `updating` state.

## Chats, agents and tasks

Chat is the main first-version route for assigning/changing work. Preserve separate threads with dynamic membership, actual agent/user authorship, chronological joins/messages/events, evolving titles and streaming partial replies. Supported conversations include one user with one or more agents, agent-only discussion, later user participation and one-agent reporting such as `CHAT Report`. Do not flatten this model into one anonymous assistant or require User in every chat. The UI may be simple **plain text**; Markdown, cards and rich references can come later without losing attribution or history.

Content agents solve project goals; [core agents](../agents/core-agents.md) are engine-prepared but ordinary editable/committed project Books; [system agents](../agents/system-agents.md) have engine-owned definitions. This replaces the old "non-agent" term without changing built-in semantics. Core origin does not grant hidden privileges or require another agent runtime.

[Ordinary and system tasks](../cli/system-tasks.md) use one inventory, detail and event contract. Preserve definition versus occurrence/run, priorities, conditions/dependencies, progress, completion and retry distinctions. System tasks can use engine code without a project Book or LLM call. Definition ownership, descriptive core provenance and project-relative content/system purpose are independent properties; use the shared inventory without another execution kind or separate window. Follow [task purpose](../concepts/minimal-interruption/work-purpose.md) and append-only purpose refinement for source-backed tasks. Passive agent/task summaries are useful, but the first App has no required direct source editor or full manual task/agent forms.

Later editing progresses from chat instructions to a Book source editor and then domain-specific forms. Keep that evolution possible now. A shared TypeScript Book parse/edit/serialize library, generic source CRUD and engine-reported allowed task actions are **proposals for technical assessment**, not a settled wire schema or prerequisites for version zero. Decide transport IDs/permanent IDs and rename/reference reconciliation together without replacing the [Book-name identity](../book-language/references.md) contract by assumption.

## Wallet and in-App attention

The first App provides a simple protected Wallet interface for adding/updating access credentials one at a time through the engine's existing [Wallet](../cli/wallet.md) operations. Keep credential use, encryption at rest, protected host unlock, verification and actual user-action state in the engine. Bulk import and complete parity with the terminal Wallet are not required. The platform account, project access and Wallet authorization are separate concepts; do not expose raw secrets or recovery words through general status/chat/API responses.

Required questions and notices appear **inside the App**. Preserve real authors, targeted questions, unread versus actionable state, acceptance/clearing of a particular answer and deduplication of the same unresolved need. Agent-only traffic or a reporting append is not automatically a demand for the user. One outstanding question blocks only affected work. Push, email, service-worker delivery and other background notification channels are optional later work, or additions only if genuinely trivial and non-delaying. The preferred division is that the App decides notification UX from engine data/events; exact rules and delivery design remain the App team's responsibility.

The App exposes the [automatic-update switch](../cli/updates.md); displaying the loaded version is useful but optional for the first release. Advanced ranges, choosing historical releases and a separate update screen are not required.

## Access, transport and zero trust

First-version project access can be binary: an authenticated user has project access or does not. No fine-grained project roles, private-chat matrix, public agents or draft test-chat product is required. Authentication and authorization still apply to every exposed operation; simple UI is not anonymous authority.

Only the authorized client and engine may read project content. Central account/backend and relay services must not receive plaintext Books, chat/task content, files, Wallet credentials or any terminal content. The same boundary must hold for future audio/video and browser interaction. Account/registration/availability/billing metadata is separately minimized and agreed; it is not permission to send project content as telemetry. External AI providers and configured tools still receive the inputs the engine is authorized to send to them.

Share domain operations and lifecycle rather than copying terminal logic into the App or relay. The existing [local API](../cli/api.md) remains loopback-only with its current local protections. Future remote access needs a separately authenticated, encrypted transport/gateway over those operations; exposing the local port publicly or trusting proxy headers is not an integration. UI delivery, origin verification, client/API compatibility and the place of a framework such as Next.js require architectural assessment. Next.js is acceptable when justified by the new design, not simply because a predecessor used it.

Reconnect must preserve acknowledged commands, ordered chat/event history and partial responses without duplicate tasks, messages or external effects. Distinguish accepted, pending, applied, completed, failed and unknown outcomes. Resolve uncertain outcomes before retrying mutations. Common schemas/capabilities and conformance checks must be reviewed against this Reborn scope; the existing platform draft is a starting point and can be substantially revised before a joint contract is accepted.

## Service fallback

The preferred fallback for features without native UI is an **interactive terminal dashboard inside the web App**, preserving input, colors and interaction through the same protected access. Alternatives for the App team's assessment are engine-generated text/Markdown rendered by the App, or deferring a feature until native UI exists. Assess feasibility and the first-release scope rather than declaring one implementation already agreed. An onboarding/authentication path still needs a genuinely usable interaction; a placeholder terminal or unfinishable login is not enough.

Native project lifecycle remains required whichever fallback is selected. A service Markdown surface does not make Markdown a version-zero chat requirement. All fallback content/input obeys the same access, secrecy and encrypted-content boundaries. No unrelated full server desktop or browser administration UI is required now.

## Explicitly deferred, designed for now

- **Early version-one candidates:** attach a project initialized independently through CLI; re-pair after loss of the original device. They share technical foundations but may differ in identity/authority checks. Existing work continues without that device. For now recovery may require SSH/physical host access. Only a genuinely trivial existing-project attachment may be added to version zero; even one extra day is grounds to defer it. QR pairing is desirable for assessment, with no fixed placement/flow required for the first release.
- Book source editing, then richer task/agent forms; diagnostics and reference warnings supplied by the engine.
- File attachments outside onboarding, richer chat rendering/cards/references, detailed Usage/Health and graphs.
- Full-duplex live audio processed by the engine, later video, and remote interaction with an engine browser tab for manual login. Design the connection for these later capabilities without implementing them all now.
- Fine-grained project permissions, advanced/background notifications and offline work.

Extensibility is required now; the complete future feature set is not.

## Technical handoff and joint acceptance

The engine owner defines Reborn behavior. The App/integration team proposes architecture, UX, contracts and ownership with the engine team. Before implementation, resolve:

- Host/project identity, clone/move/restore distinction and preventing simultaneous use of one registration identity; connection and authority while a project is stopped.
- Book names, transport identity and renames; task definitions/runs, recurrence/conditions and system work; multi-party chat, joins/authors/titles and streaming.
- Installation/pairing and init/authentication handoff, protected Wallet/file operations and the selected service fallback.
- Command acknowledgement/idempotency, reconnect/cursor replay, capabilities/version compatibility and future duplex media/tab transport.
- UI serving/provenance, minimal metadata/billing, release verification/signing/delays/revocation and engine/UI distribution. The existing numeric release-delay proposal is not implicitly approved; see [updates](../cli/updates.md).
- Engine-owned replacement/recovery and shared-install coordination, including the simple host service's own updates; no singleton update decision maker.
- The minimum passive overview/notification UX, implementation owners, shared contract revisions and end-to-end acceptance.

The common proof is one flow from App account/installation through pairing, first init, real harness authentication, Wallet, onboarding upload, project start, attributed streaming chat and work, then pause/resume/stop/start/restart and reconnect without duplicate effects. Include a background automatic update with migration/recovery and the correct policy/manual intent. Verify engine work continues without a connected client/relay. Future extensions and unselected fallback alternatives are not additional first-release acceptance requirements.
