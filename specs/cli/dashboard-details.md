# Expandable execution, tools and synchronization details

[Main specification](../_main.md) · [Panel layout](dashboard-layout.md) · [Shared controls](controls.md) · [Shared status](status-view.md)

The project dashboard is the engine's **cockpit**: a compact overview of its important parts, with consistent drill-down into each. Keep attention, current work, service controls and compact tools status visible. Verbose execution, individual-tool and synchronization details are initially collapsed and reachable through labelled terminal shortcuts and equivalent accessible browser controls. Opening/closing a detail is inspection, not mutation. Keep focus and drafts stable; global shortcuts never intercept composers or pickers. Panel navigation uses arrows to focus, Enter to drill in and Escape to return under [layout](dashboard-layout.md); exact grid placement remains a presentation choice.

## Execution detail

For the selected current task/run, show the agent, named tool instance, harness variant, effective model identifier/name and thinking level together. These are separate concepts. Include applicable overrides, phase and attempt/consultation attribution. When several harnesses/accounts or models are involved, show actual contexts rather than one misleading project-wide provider label.

Use execution metadata, not merely saved defaults. Preserve provider-native thinking terminology where returned. Distinguish unknown/not reported, unresolved automatic choice and unsupported/not applicable. Refresh with activity; label last-run data as historical and do not invent inference while idle. Raw/API/detail snapshots retain the same information.

## Tools overview and management

Show the ordered [tool inventory](tools.md), identifying each instance by name, type and variant, with enabled, usable, currently used and retained-current-use/draining states distinguished. The compact overview shows resource health and missing browser/harness warnings without a configuration dump. A shortcut opens the full inventory and then one instance's details; preserve the existing dashboard drill-down pattern instead of adding a separate management application.

Provide add, modify, reorder, **enable and disable as primary actions**, and clearly secondary permanent removal. Editing exposes the variant's applicable fields, optional description and safe credential-reference input. Explain actual account/profile identity; do not imply that two names referencing one native login or browser profile are two separate accounts. Secret values are write-only inputs and never shown in ordinary detail responses.

All actions call the same [management operations](tool-management.md) as CLI and init. Configuration changes commit immediately; they are not generic temporary dashboard controls. Display applied, committed, pending-persistence, refused and failed outcomes honestly. A live refresh or opening a form never performs a save. Protect stale edit revisions and preserve another client's accepted changes.

For an in-use modify/disable/remove, offer the shared alternatives: save the change while current work finishes with its acquired context, or invoke the existing **whole-engine force stop** and then separately apply/reconfirm the tool change after termination. Do not invent a tool-specific force-stop operation or suggest that disable cancelled an in-flight payment/post. Removing/disabling the last enabled instance of a type requires the additional specific confirmation about effective inability to start new work. Neither removal nor disable automatically puts the service into pause/stopped.

## Individual browser diagnostics

For the selected named browser tool, show saved and effective variant, profile source, authorized resolved path, `isHeadless`, actual launch/connection health, ownership/busy state and retained active uses. Distinguish newly saved settings from an old context still used by current work. A profile path does not grant access to its contents, cookies or credentials. Keep multiple browser instances independently identifiable.

Show real redacted failure evidence, automatic recovery attempts/outcomes and next retry where known. Recheck, retry startup and restart target this **owned browser instance**, calling the same [browser recovery](browser.md) as automatic repair. Label deferred safe-boundary actions; do not claim they have already happened. Preserve sessions, task checkpoints and external-effect evidence, and never kill unrelated user/project browsers or restart the entire engine as ordinary browser repair.

Automatic repair does not depend on an open panel or routine manual Restart clicks. Significant resource failures remain visible in the main overview/attention area while verbose details are closed. Runtime-only diagnosis/restart creates no Git commit; saved tool configuration does.

## Synchronization detail, only when enabled

Render a dedicated compact synchronization panel **only while effective Git autosync is enabled**. Expand it using the same navigation pattern to show redacted Git origin/tracking branch, observed phase, last attempt and successful integration/publication, known pending incoming/outgoing work, errors/conflicts, deferred integration and next retry. Unknown or stale information is explicit. A failed remote operation is not a stopped-engine indication.

Provide **Synchronize now**, invoking one cycle of the shared [synchronization coordinator](git-synchronization.md), with accepted/queued/running/success/deferred/failure outcomes. Coalesce overlapping requests with scheduled/boundary attempts. The button does not create another scheduler, rewrite configuration, enable a disabled policy, bypass ownership checks or guarantee that fetch has already integrated dirty files. Successful merges may create their ordinary commit; merely opening the panel does not.

When autosync is off, omit this dedicated panel and its manual action rather than showing a permanently inactive box. General configuration inspection can still report the stored choice. Changing the policy refreshes the view without losing unrelated drafts or misleading users about an already-running attempt.

## Acceptance outcomes

Open each applicable detail by its discoverable shortcut and return without mutation. Verify actual execution metadata with multiple instances/consultations and unknown model data. Add/enable a tool from another terminal during active work and observe immediate availability; save management changes with their own commits and the exact shared protections. Test every browser profile source and per-instance automatic/manual recovery without secret disclosure or unrelated kills. Toggle autosync: its panel appears only when enabled, reports real pending/failing state and triggers the shared cycle. Lifecycle controls and important waits remain visible in all layouts.

## Agents, task sources and editor

From the separate Agents/team panel, inspect every available agent, actual current work and its assigned task queue. Open a chat directly with the selected agent, inspect effective instructions and open the real project Book for editing. Task/chat details also expose their readable source and links. [Book editing](book-editor.md) defines Enter/newline, Ctrl+S/save, shared rich paste and nonblocking warnings; do not create another source editor per entity kind. Expert remains engine-owned/read-only.
