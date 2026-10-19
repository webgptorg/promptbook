# Lightweight browser dashboard

[Main specification](../_main.md) · [Project service API](api.md)

Serve a lightweight JavaScript single-page application at `/` on the project's HTTP server. It is a frontend for the independently usable API, not another service, runtime or queue. No separate frontend server/setup is required. The engine works with zero clients, and many browser/terminal clients can attach concurrently without acquiring its lock.

Load a static shell/assets, then obtain live data and send controls only through the API. Render/update in the browser without page reloads, server-rendered runtime fragments or server-side HTML form actions. Keep the frontend small, without React or another frontend application framework. Scheduling, state transitions, diagnosis and repair belong to the engine, not the UI.

Present the live [shared status view](status-view.md) and [panel hierarchy](dashboard-layout.md): actual engine version, project/connection and four-state service status, current agent/task/phase, queue, results, waits, errors and chat attention. A main visible **service-control panel** exposes pause/resume, pending-intent cancellation/change, graceful stop, explicit force stop and restart through [shared lifecycle operations](service-lifecycle.md). Stop and restart are not hidden in diagnostics and are not equivalent to closing the page.

Use initially collapsed execution and browser [detail panels](dashboard-details.md). Execution details show the actual harness, model and thinking level with agent/attempt attribution, not guessed defaults. Browser details show effective profile source/path, health, real redacted failures, automatic recovery and safe recheck/retry/restart controls. Keep actionable failures visible in the main summary while verbose details are closed. The optional URL/QR is connection information, not a replacement for status or controls.

[Chats awaiting User](user-interactions.md) are the most prominent attention area: count, actual agent speaker, reason, links and direct open-thread action. Unread is separate; all chats remain accessible. New-chat entry uses the [Chatter-first two-choice flow](chat-ui.md), with all valid alternatives reachable through Choose another agent. Existing questions retain their authors, including Fixer; do not replace them with anonymous forms or Chatter threads. Required actions remain noticeable on narrow screens without scrolling past logs.

New data never steals focus, resets panel choices or discards drafts. Reading a chat does not resolve it; only an accepted answer/action changes durable state. Client-local layout, focus and scrolling remain local; engine state and accepted mutations synchronize across browser, terminal and direct API clients. Equivalent behavior does not require identical layouts or terminal keys.

Harness inventories use featured/More [catalog presentation](harness-plugins.md), not unbounded configuration dumps. Actual activity remains inspectable even for non-featured harnesses. Errors include meaning, next action and redacted diagnostic reference.

Show loading, disconnection, observed service exit and failed/unconfirmed actions honestly. A stopped display means there is no live engine, not a fifth runtime state. Page refresh/closure/failure never starts, stops or recreates a service, loses durable questions or resets runtime state. Controls obey authorization, revision and safety checks; an explicit service-stop action affects every connected viewer because they share that engine.

The [global dashboard](global-dashboard.md) is a separate host-wide terminal feature; this per-project SPA does not create a global engine or silently acquire machine-wide access. See [controls](controls.md), [channels](channels.md) and [start output](start.md).
