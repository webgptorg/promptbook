# Lightweight browser dashboard

[Main specification](../_main.md) · [Project service API](api.md)

Serve a lightweight JavaScript SPA at `/` on the project's HTTP server. It is a frontend for the independent authenticated API, not another service/queue. No separate frontend server/setup is needed. The engine runs with zero clients and many browser/terminal/API clients may attach without owning its lock.

Load static shell/assets, then obtain live state and send controls only through API. Render in the browser without server-rendered runtime fragments, page reloads or server-side form actions. Keep it small, without React or another frontend application framework. Scheduling, validation, management, synchronization and recovery live in the shared engine/domain operations, not duplicated UI code.

Use the [status view](status-view.md) and [cockpit hierarchy](dashboard-layout.md): actual project/version/lifecycle, current work, queue, tools, outcomes/errors, attention and connection. A visible main lifecycle panel exposes pause/resume, pending-intent changes, graceful stop, explicit whole-engine force stop and restart. Stop/restart are not hidden in diagnostics or equivalent to closing the page.

Use consistent [expandable details](dashboard-details.md) for actual execution metadata, named tool management and individual browser profiles/health/recovery. Primary tool actions are enable/disable; permanent removal is secondary. All management persists scoped configuration commits and uses the same protections and types as CLI/init. New tools can serve current work without page or engine restart. A no-tools wait is not a technically stopped service.

When and only when autosync is enabled, show its compact panel with real status, drill-down details and Synchronize now through the shared coordinator. Omit the panel while off. Pending/failed remote operations do not obscure successful local work. Do not implement a separate frontend pull loop or claim fetch equals safe integration.

Chats awaiting User are the highest-priority attention area, with actual agent, reason, links and direct thread action. New chat uses [Chatter-first entry](chat-ui.md); existing questions keep their authors, including Fixer. All chats remain accessible and unread is distinct from actionable. No new Fixer-specific UI/channel is introduced. Main actionable failures remain noticeable on narrow screens without scrolling through logs.

Updates never steal focus, reset collapsed choices or discard drafts/secret-entry input. Reading alone does not answer a question or save settings. Viewer focus/layout is local; accepted state mutations propagate to all clients. Harness adapter catalogs use featured/More, while configured same-variant instances remain individually visible. No secret is echoed in ordinary state or diagnostic errors.

Show loading, disconnection, observed service exit and failed/unconfirmed/pending operations truthfully. Refresh/closure/failure never starts/stops/recreates the service or duplicates work/messages. Mutations obey authorization and revision/ownership checks; explicit whole-engine stop affects all viewers. The global dashboard remains a separate host-wide terminal feature, not silent machine-wide authority in this SPA. See [controls](controls.md), [channels](channels.md) and [start output](start.md).
