# Dashboard pages and detailed views

[Main specification](../_main.md) · [Home-screen layout](dashboard-layout.md) · [Shared controls](controls.md) · [Shared status](status-view.md)

The project dashboard is an operational home screen plus **pages**. The home screen contains compact tiles. Enter or a documented shortcut opens a domain page that takes over the dashboard surface. Do not implement detailed views as an in-place expansion that leaves the full tile grid visible around it.

Pages may contain scrollable lists/logs/details. Preserve a concise fixed page identity/context and discoverable actions where practical, while the body scrolls. Escape returns to the previous dashboard level; viewer-local focus, scroll and drafts survive refresh and resize. Opening/closing a page is inspection, not mutation.

All page actions call the same engine/domain operations as CLI/API. A page is a UI/controller for its domain, never the place where scheduling, health monitoring, tool recovery or persistence business logic is implemented.

## Execution page

List concurrent active work and let the operator select a task/run without pretending there is only one project-wide current task. For the selected task/run, show the agent, named tool instance, harness variant, effective model identifier/name and thinking level together. These are separate concepts. Include applicable overrides, phase and attempt/consultation attribution. When several harnesses/accounts or models are involved, show actual contexts rather than one misleading project-wide provider label.

Use execution metadata, not merely saved defaults. Preserve provider-native thinking terminology where returned. Distinguish unknown/not reported, unresolved automatic choice and unsupported/not applicable. Refresh with activity; label last-run data as historical and do not invent inference while idle. Raw/API/detail snapshots retain the same information.

The home Current work tile uses only a bounded agent/task/phase/wait summary and a clear attention state when blocked. Execution/provider internals live here.

## Tools page and management

Show the ordered [tool inventory](tools.md), identifying each instance by name, type and variant, with enabled, usable, currently used and retained-current-use/draining states distinguished. The home Tools tile shows only a compact health/count/problem summary.

The Tools page provides add, modify, reorder, **enable and disable as primary actions**, and clearly secondary permanent removal. Opening one tool may enter a nested tool detail page while preserving the Tools list selection.

Editing exposes the variant's applicable fields, optional description and safe credential-reference input. Explain actual account/profile identity; do not imply that two names referencing one native login or browser profile are two separate accounts. Secret values are write-only inputs and never shown in ordinary detail responses.

All actions call the same [management operations](tool-management.md) as CLI and init. Configuration changes commit immediately; they are not generic temporary dashboard controls. Display applied, committed, pending-persistence, refused and failed outcomes honestly. A live refresh or opening a form never performs a save. Protect stale edit revisions and preserve another client's accepted changes.

For an in-use modify/disable/remove, offer the shared alternatives: save the change while current work finishes with its acquired context, or invoke the existing **whole-engine force stop** and then separately apply/reconfirm the tool change after termination. Do not invent a tool-specific force-stop operation. Removing/disabling the last enabled instance of a type requires the additional specific confirmation about inability to start new work.

## Individual browser page

For the selected named browser tool, show saved and effective variant, profile source, authorized resolved path, `isHeadless`, actual launch/connection health, ownership/busy state and retained active uses. Distinguish newly saved settings from an old context still used by current work. A profile path does not grant access to its contents, cookies or credentials.

Show real redacted failure evidence, automatic recovery attempts/outcomes and next retry where known. Recheck, retry startup, restart, kill and open-test-GitHub-tab actions target its **actual profile connection pool**, calling the same [browser recovery](browser.md) as automatic repair. Label deferred safe-boundary actions; preserve sessions, task checkpoints and external-effect evidence, and never kill unrelated browsers or restart the entire engine as ordinary browser repair. Show connected engines/active tabs and that restart/kill affects all users of this selected pool. There is no master/slave engine; the last managed disconnection closes the process. Manual headful login remains possible, but no new remote desktop or generic Open browser action is required.

Significant failures set attention on the Tools/Browser path of the home screen; verbose evidence stays here.

## Wallet page

Wallet has its own home tile and page over the project [sub-engine](wallet.md). Summarize readiness/pending count compactly; list service/account labels and pending actions in detail. Provide concealed credential management and deliberate protected recovery/setup input through shared engine operations. Never show passwords, recovery words or raw keys in ordinary detail/status, logs or snapshots. Use the one attention presentation, clear answered actions promptly and keep independent work running.

## Agents, Chats, Tasks and activity pages

Agents, Chats and Tasks remain separate home tiles and separate pages.

The Agents page lists every available agent with actual activity and assigned queue. It can open the selected agent's source, current/queued work and direct chat. [Book editing](book-editor.md) defines the shared editor; do not create another source editor here.

The Chats page lists all conversations, unread/actionable states and new Chatter-first entry. Opening a thread enters the ordinary full chat view with live task cards, declared multi-agent authorship, input during progress and post-final Thinking/duration collapse under [chat UI](chat-ui.md). Waiting-for-user state can mark the Chats tile for attention but does not force navigation.

The Tasks page uses the [complete task view](task-views.md), with smart default order and user-selected sorting independent of engine scheduling. Tasker remains the task-authoring entry.

The Results/Activity page may scroll through longer runtime history. The home tile contains only bounded totals/recent outcome/error information.

## Synchronization page, only when enabled

Render a dedicated Synchronization tile/page **only while effective Git autosync is enabled**. Its page shows redacted Git origin/tracking branch, observed phase, last attempt and successful integration/publication, known pending incoming/outgoing work, errors/conflicts, deferred integration and next retry. Unknown or stale information is explicit.

Provide **Synchronize now**, invoking one cycle of the shared [synchronization coordinator](git-synchronization.md), with accepted/queued/running/success/deferred/failure outcomes. Coalesce overlapping requests with scheduled/boundary attempts. It does not create another scheduler or bypass dirty-work safety.

When autosync is off, omit this dedicated tile/page rather than showing a permanently inactive box. General configuration inspection can still report the stored choice.

## Connection page

Keep connection information secondary on the home screen. The Connection page owns verified local/remote addresses, provider/tunnel state, pairing guidance, QR code and link detail. Long URLs/QR art must not force the dashboard home screen to scroll.

## System page

The System page owns the Promptbook Engine's operational identity and lifecycle: project/runtime location, actual engine version/installation/process data, lifecycle/pending intent, manual Pause/Resume, stop/restart/force actions and the **complete set of active pause reasons**.

When only the ordinary manual pause reason exists, keep the presentation simple. When health or multiple reasons coexist, show each reason with its owner/severity and explain why generic Resume may not return the engine to running. System invokes shared lifecycle operations; it never edits Health's measurements to fake recovery.

## Health page

The Health page is a controller/view over the exactly-one-per-engine [Health sub-engine](health-sub-engine.md). Show disk, RAM, swap, combined available memory, CPU/load, connectivity, configured preventive limits, incident freshness/severity and scheduling impact.

Expose Promptbook-project cache cleanup and supported Linux swap remediation through Health sub-engine operations. Allow incident-scoped override only for a soft health pause and show a strong warning. Hard health pauses have no override.

Do **not** put generic manual Pause/Resume or a "Pause all" control on Health. Manual pause belongs to System. Merely viewing/acknowledging the tile/page does not resolve a health incident.

## Acceptance outcomes

Open every applicable page by keyboard and return without mutation. The root grid is not rendered as background clutter while a page is open. Long inventories and logs scroll while context/actions remain usable. Verify actual execution metadata with multiple instances/consultations and unknown model data. Add/enable a tool from another terminal during active work and observe immediate availability. Test browser recovery without secret disclosure or unrelated kills. Toggle autosync: its tile/page appears only when enabled. System and Health pages remain distinct.
