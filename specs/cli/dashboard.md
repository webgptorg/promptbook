# Lightweight browser dashboard

[Main specification](../_main.md) · [Local service API](api.md)

Serve a lightweight JavaScript single-page application at `/` on the project's local HTTP server. It is a frontend for the independently usable service API, not another service, runtime or queue. No separate frontend server or setup is required.

The browser loads a static application shell and assets, then obtains all live project data and sends all runtime controls through that server's API endpoints. Render and update runtime views in the browser without page reloads, server-rendered status pages/fragments or server-side HTML form actions. The service may serve the static shell; it must not mix runtime HTML rendering into status and control behavior. Keep the frontend very small, without React or another frontend application framework.

Present the live [shared project status view](status-view.md), with the same core information and applicable controls as the [terminal dashboard](terminal.md): service engine version, project/connection status, agent/task/harness and known model/effort, phase, queue/task details, results/statistics, waits, blockers, errors, unread chats and chats awaiting a human answer. Include the actual dashboard URL and its QR code as connection information, not a replacement for the status view. Both clients reflect the same state; changes and chat messages through either or a direct API client appear in the others. Equivalent behavior does not require identical layouts or terminal shortcuts in the browser.

[Chats awaiting the user](user-interactions.md) are the most prominent attention area, with count, identified agent speaker, reason, linked tasks and a **direct open-chat action**. Unread chats are marked separately and an **all chats** view lists every thread. Offer a new-chat action with a one-agent picker, including explicit access to hidden/core agents and Expert; do not present an anonymous request form. They remain noticeable without opening another page/tab or scrolling past logs, including on narrow screens. New requests and data updates must not steal input focus or discard drafts. Viewing/reading a chat does not resolve its question; only an accepted answer/action changes its durable status.

Follow [harness presentation](harness-plugins.md): catalog browsing begins with featured names and More, with configuration/model inventories available on request rather than overwhelming the status view. Current activity is always visible even for a non-featured harness. [Errors](errors.md) include their meaning, next action and redacted diagnostic reference.

Display loading, disconnected, stopped and failed-action states honestly rather than presenting stale data as live. Preserve unsubmitted input during updates. Page refresh, failure or closure must not start, stop or recreate the service, lose durable questions or reset runtime state. All controls obey the API's authorization and shared safety rules.

See [shared controls](controls.md), [channels](channels.md), [user interactions](user-interactions.md) and [start output](start.md).
