# Lightweight browser dashboard

[Main specification](../_main.md) · [Project service API](api.md)

Serve a lightweight JavaScript SPA at `/` on the project's HTTP server. It is a frontend for the independent authenticated API, not another service/queue. No separate frontend server/setup is needed. The engine runs with zero clients and many browser/terminal/API clients may attach without owning its lock.

Load static shell/assets, then obtain live state and send controls only through API. Render in the browser without server-rendered runtime fragments, page reloads or server-side form actions. Keep it small, without React or another frontend application framework. Scheduling, validation, management, health monitoring, synchronization and recovery live in shared engine/sub-engine/domain operations, not duplicated UI code.

## Home and pages

Use the same [dashboard home-screen hierarchy](dashboard-layout.md) as the terminal. The browser root is a compact responsive tile cockpit containing PTBK/project/service state, current work, operator attention and entries to operational domains. Do not turn it into a long page that requires scrolling past technical details before the operator can see all core tiles.

Adapt across ordinary desktop/window sizes. On smaller surfaces reduce columns and secondary text; on larger surfaces use space without expanding every diagnostic. Focus/selection and attention are distinct visual states. New attention is conspicuous but never forcibly changes the selected tile/page. Persistent unresolved attention remains marked after transient emphasis settles.

Use the same nested tile hierarchy on Tools and Health and provide the simple [Usage](usage.md) page with visible billing/estimate distinctions. Opening a tile navigates to a dashboard page that uses the available surface for that domain; do not leave the entire root grid rendered around an expanded subpanel. Browser history/back or an explicit Back control returns to the home screen while preserving reasonable local state. Long page bodies may scroll; keep page context/actions accessible.

Use [dashboard pages](dashboard-details.md) for execution, System, Health, Wallet, named tools/browser profiles, Agents, Chats, Tasks, activity/results, Connection and enabled Synchronization. Technical version/path/URL/model/profile details live on those pages rather than permanently on root.

The full-width identity header emphasizes PTBK/project; lifecycle/pause state stays in System/related tiles without an extra header pause badge. Keep focus visually strong without layout shift, equivalent to the terminal's double border and bold heading.

## Shared operations

A visible System/lifecycle page exposes manual pause/resume, active pause reasons, pending-intent changes, graceful stop, explicit whole-engine force stop and restart through the shared engine operations. Stop/restart are not equivalent to closing the page.

Tool management supports add/modify/reorder, primary enable/disable and secondary removal through the same operations as CLI/init. Saved changes commit immediately and new tools can serve current work without page or engine restart. A no-tools wait is not a technically stopped service.

Health state and remediation come from the per-engine [Health sub-engine](health-sub-engine.md); the Health page does not implement monitoring or its own manual pause state.

When and only when autosync is enabled, show its tile/page with real status, drill-down detail and Synchronize now through the shared coordinator. Omit it while off. Pending/failed remote operations do not obscure successful local work.

Chats awaiting User are actionable attention with actual agent, reason, links and direct thread action. Wallet uses the same attention for missing login actions and protected secret input. Chat/task questions clear attention immediately on saved response without pausing unrelated work. New chat uses [Chatter-first entry](chat-ui.md); existing questions keep their authors. Unread is distinct from actionable.

## Viewer behavior and safety

Updates never steal focus, reset page/list choices or discard drafts/secret-entry input. Reading alone does not answer a question, acknowledge an engine incident globally or save settings. Viewer focus/layout and settled transient attention are local; accepted state mutations propagate to all clients.

Show loading, disconnection, observed service exit and failed/unconfirmed/pending operations truthfully. Refresh/closure/failure never starts/stops/recreates the service or duplicates work/messages. Mutations obey authorization and revision/ownership checks.

No secret is echoed in ordinary state or diagnostic errors. Local address details live on Connection rather than forcing the home page taller. The browser opens directly on the engine computer using the API's local bootstrap and same-origin safeguards. The global dashboard remains a separate host-wide terminal feature. See [controls](controls.md), [channels](channels.md) and [start](start.md).
