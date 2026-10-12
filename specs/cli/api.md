# Local service API

[Main specification](../_main.md) · [Shared runtime controls](controls.md)

The active project service exposes an independently usable HTTP API for inspecting and controlling its runtime. The API works without opening the browser app or terminal dashboard; neither client owns the service or starts a separate queue. Keep service behavior and API responses independent of page rendering.

Start enables the local HTTP server by default in either process mode. Bind to localhost, select a free port automatically or use `--port`, and report the actual address and explicit port conflicts. `--no-server` disables HTTP, including the browser app. When enabled for finite run, the server belongs to that invocation and must not keep it running after completion.

Expose structured runtime state and the shared control capabilities: actual service engine version, project identity, current agent/task/harness and known model/effort, phase, queue/task details, results/statistics, waits, blockers, errors, pending requests and effective settings. Support the same applicable actions as the dashboards, including pause/resume, skipping a pacing/backoff wait, graceful stop, answers and allowed settings changes. Report action outcomes and whether settings are active, deferred or require restart; do not report a request as completed before it is applied.

Clients obtain fresh state and observe changes made through other channels. Inspection is read-only; mutations act on the same active process and obey the shared ownership, task, configuration and recovery rules. Core status and control features must not require HTML forms, server-rendered fragments or browser-only business logic.

The API is not a privileged bypass. Reject unauthorized control requests, including unauthorized cross-origin requests, invalid input, stale edits and access outside the project. Merely reaching localhost is not authorization. Do not expose secrets, browser profile contents or unredacted diagnostic data. Answering an already-resolved request cannot apply it twice.

Client failures or disconnections do not stop a daemon, duplicate tasks or reset state. The [browser dashboard](dashboard.md) is a lightweight consumer served at the same server's root. See [channels](channels.md), [user interactions](user-interactions.md) and [process modes](process-modes.md).
