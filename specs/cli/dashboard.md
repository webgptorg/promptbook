# Shared graphical dashboard and deprecated standalone browser entry

[Main specification](../_main.md) · [Project service API](api.md) · [Desktop client](desktop.md)

## Standalone entry deprecation

Opening the full project dashboard directly in a regular browser at the engine's loopback address is **deprecated** and scheduled for removal. The [Promptbook App connector](../app/connection.md) is the supported browser entry for full project control. While the standalone entry exists, mark it as deprecated in the page and CLI help.

Retire only the direct, standalone browser entry. The shared graphical renderer and authenticated loopback API still serve the packaged clients, including Electron and the app-protected Android WebView. The terminal dashboard and its [temporary feature bridges](interactive-feature-bridges.md) for voice and live browser tab control have separate entry points and lifetimes. New desktop workspace functionality belongs to the [Electron client](desktop.md).

Serve the shared JavaScript SPA from the project's loopback HTTP service for packaged local clients. It consumes the independent authenticated API. The engine runs with zero clients or with multiple attached clients, which do not own its lock.

Load static shell/assets, then obtain live state and send controls only through API. Render in the browser without server-rendered runtime fragments, page reloads or server-side form actions. Keep it small, without React or another frontend application framework. Scheduling, validation, management, health monitoring, synchronization and recovery live in shared engine/sub-engine/domain operations, not duplicated UI code.

## Home and pages

Use the same [dashboard home-screen hierarchy](dashboard-layout.md) as the terminal. The browser root is a compact responsive tile cockpit containing ptbk/project/service state, the replacement Harnesses session summary, operator attention and entries to operational domains. Do not turn it into a long page that requires scrolling past technical details before the operator can see all core tiles.

Adapt across ordinary desktop/window sizes. On smaller surfaces reduce columns and secondary text; on larger surfaces use space without expanding every diagnostic. Focus/selection and attention are distinct visual states. New attention is conspicuous but never forcibly changes the selected tile/page. Apply [shared seen state](notifications.md#seen-is-separate-from-resolved): a seen chat/Wallet occurrence loses its alert while pending work stays inspectable; Health/system warnings follow their own resolution/override rules.

Use the same nested tile hierarchy on Tools and Health and provide the simple [Usage](usage.md) page with visible billing/estimate distinctions. Opening a tile navigates to a dashboard page that uses the available surface for that domain; do not leave the entire root grid rendered around an expanded subpanel. Browser history/back or an explicit Back control returns to the home screen while preserving reasonable local state. Long page bodies may scroll; keep page context/actions accessible.

Use [dashboard pages](dashboard-details.md) for execution, System, Health, Wallet, named tools/browser profiles, Agents, Chats, Tasks, activity/results, Usage, External activity log, History, Files, App and enabled Synchronization. Technical version/path/URL/model/profile details live on those pages rather than permanently on root.

The full-width identity header emphasizes ptbk/project with the [saved brief](project-report-ui.md) beneath it and explicit Discuss/Refresh controls; lifecycle/pause state stays in System/related tiles without an extra header pause badge. Keep focus visually strong without layout shift, equivalent to the terminal's double border and bold heading.

## Shared operations

A visible System/lifecycle page exposes manual pause/resume, active pause reasons, pending-intent changes, graceful stop, explicit whole-engine force stop and restart through the shared engine operations. Stop/restart are not equivalent to closing the page.

Tool management supports add/modify/reorder, primary enable/disable and secondary removal through the same operations as CLI/init. Saved changes commit immediately and new tools can serve current work without page or engine restart. A no-tools wait is not a technically stopped service.

Health state and remediation come from the per-engine [Health sub-engine](health-sub-engine.md); the Health page does not implement monitoring or its own manual pause state.

When and only when autosync is enabled, show its tile/page with real status, drill-down detail and Synchronize now through the shared coordinator. Omit it while off. Pending/failed remote operations do not obscure successful local work.

New explicit User pings create chat attention with actual agent, reason, links and direct thread action; waiting and seen state remain distinct. Wallet uses the same attention for missing login actions and protected secret input, with explicit **Mark as seen** and **Reject request**. Chat/task questions clear attention immediately on saved response without pausing unrelated work. New chat uses [Chatter-first entry](chat-ui.md); existing questions keep their authors. Unread is distinct from actionable. Browser surfaces share this state; the initial terminal sound/desktop-notification adapters do not establish a browser or remote push service.

## Viewer behavior and safety

Updates never steal focus, reset page/list choices or discard drafts/secret-entry input. Actually displaying a calling message during active chat viewing marks its occurrence seen across clients; it never answers, approves, resolves a Health incident or saves configuration. Wallet seen/reject actions are explicit. Viewer focus/layout/drafts stay local; accepted request/seen state propagates to all clients.

Show loading, disconnection, observed service exit and failed/unconfirmed/pending operations truthfully. Refresh/closure/failure never starts/stops/recreates the service or duplicates work/messages. Mutations obey authorization and revision/ownership checks.

No secret is echoed in ordinary state or diagnostic errors. App connection details live on the App page rather than forcing the home page taller, and the local address is not presented. The deprecated standalone browser entry uses the same local bootstrap and same-origin safeguards while it exists. The global dashboard remains a separate host-wide terminal feature. See [controls](controls.md), [channels](channels.md) and [start](start.md).

Opening the view only reads the shared saved report; no generation occurs. Discuss creates a new ordinary Chatter chat seeded with the exact displayed brief, while explicit Refresh coalesces engine work. External activity log, History and Files browsing use shared readers even with autosync off; Book viewing/editing shares a core and supports long sources.

## Session inspection and native entry

The browser shares the **Harnesses** tile/page replacing Current work, common selected-session data and guarded watch/exclusive/shared entry under [harness sessions](harness-sessions.md). A web terminal, if supported, carries the actual native client with enforced input gates; browser rendering does not create native-attachment capability. Keep the common view when unsupported. Closing/detaching the terminal returns to the selected session, without stopping the backend or engine. No additional per-entity lifecycle controls are introduced.

## Local desktop attachment

The optional [desktop client](desktop.md) is another local observer/controller. CLI remains the primary interface. `ptbk dashboard --view <page>` opens a named home page directly without changing service state; it conflicts with `--global`. Every graphical page can fall back to that CLI page in the embedded terminal.

Packaged clients share the normal project state, including Wallet and chat status. Direct [voice and tab-control media surfaces](interactive-feature-bridges.md) are specified for the local desktop app and interactive CLI. The project SPA and its HTTP server are separate from the temporary CLI feature servers.
