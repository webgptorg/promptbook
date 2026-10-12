# Shared runtime controls

[Main specification](../_main.md)

There is one control model for a project's running process. Project configuration and CLI options supply defaults/overrides; terminal controls, the localhost page and REST API inspect and change the same state. An action in one interface is reflected in the others, not sent to a separate task runner.

Expose the actual running engine version, pause/resume, graceful termination, current agent/task/harness and activity, ordered queue/task details, results/statistics, waits, errors, pending user requests and effective routing. Agent and harness/model inventories remain accessible on request; catalog views follow [featured/More presentation](harness-plugins.md), not an unbounded default dump.

Every configurable CLI behavior is discoverable and adjustable through runtime controls where meaningful, including enabled harnesses, routing preferences, pacing, browser mode/profile, harness-update policy and persistence settings. Show whether a change is active, awaiting a safe boundary or requires restart. Process-mode transitions may require restart; HTTP enablement and port may remain startup-only exceptions.

Live changes are temporary unless the user explicitly saves project defaults, following [configuration precedence](configuration.md). Preserve active-task consistency. Pause prevents further task starts and visibly indicates a pending pause when work cannot stop immediately. Do not duplicate work, bypass task constraints or apply an unannounced paid-account switch. Distinguish current-task from future-task settings.

Inspection is read-only. Mutations obey the same ownership, authorization and recovery rules on every channel. See [channels](channels.md), [dashboard](dashboard.md), [terminal](terminal.md) and [browser](browser.md).
