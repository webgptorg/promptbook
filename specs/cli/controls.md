# Shared runtime controls

[Main specification](../_main.md)

There is one control model for a project's running process. CLI options supply configuration; terminal controls, the localhost page and REST API inspect and change the same state. An action in one interface is reflected in the others, not sent to a separate task runner.

Expose pause/resume, graceful termination, current activity, ordered queue and task details, results, statistics, pending user requests, discovered agents, available harnesses/models and effective routing. Show whether a change is active, pending a safe boundary or requires restart.

Every configurable CLI behavior must also be discoverable and adjustable through the runtime control interfaces where meaningful. This includes enabled harnesses, routing preferences, pacing, browser mode/profile and persistence settings. Process-mode transitions may require restart. The HTTP server's own enablement and listening port may remain startup-only exceptions; do not silently claim they changed live.

Changes must preserve the active task's consistency. Pause prevents further task starts and visibly indicates a pending pause when work cannot stop immediately. Changing settings must not duplicate work, bypass task constraints or apply an unannounced paid-account switch. Current task and future-task settings must be distinguishable.

Inspection is read-only. All mutations obey the same project ownership, authorization and recovery rules regardless of channel. See [channels](channels.md), [dashboard](dashboard.md), [terminal](terminal.md) and [browser](browser.md).
