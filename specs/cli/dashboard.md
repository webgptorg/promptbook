# Lightweight browser dashboard

[Main specification](../_main.md) · [Local service API](api.md)

Serve a lightweight JavaScript single-page application at `/` on the project's local HTTP server. It is a frontend for the independently usable service API, not another service, runtime or queue. No separate frontend server or setup is required.

The browser loads a static application shell and assets, then obtains all live project data and sends all runtime controls through that server's API endpoints. Render and update runtime views in the browser without page reloads, server-rendered status pages/fragments or server-side HTML form actions. The service may serve the static shell; it must not mix runtime HTML rendering into status and control behavior. Keep the frontend very small, without React or another frontend application framework.

Show the same core information and offer the same applicable controls as the [terminal dashboard](terminal.md): service engine version, project/connection status, agent/task/harness and known model/effort, execution phase, queue/task details, results/statistics, waits, blockers, errors and pending requests. Both are views of the same state; changes and answers through either interface or a direct API client appear in the others. Equivalent behavior does not require identical layouts or terminal shortcuts in the browser.

Follow [harness presentation](harness-plugins.md): catalog browsing begins with featured names and More, with configuration/model inventories available on request rather than overwhelming the status view. Current activity is always visible even for a non-featured harness. [Errors](errors.md) include their meaning, next action and redacted diagnostic reference.

Display loading, disconnected, stopped and failed-action states honestly rather than presenting stale data as live. Preserve unsubmitted input during updates. Page refresh, failure or closure must not start, stop or recreate the service, lose durable questions or reset runtime state. All controls obey the API's authorization and shared safety rules.

See [shared controls](controls.md), [channels](channels.md), [user interactions](user-interactions.md) and [start output](start.md).
