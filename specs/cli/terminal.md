# Terminal runtime dashboard

[Main specification](../_main.md) · [CLI presentation and interaction](interactive-ui.md)

## Attaching and lifetime

`ptbk dashboard` opens a live terminal dashboard for the selected project's existing service; `--path` selects the project as for other commands. Verify the process identity before connecting. Opening or reopening the dashboard neither initializes the project nor starts another supervisor, claims a task or changes runtime configuration. A missing or unreachable service has a clear diagnostic and next action.

The attached view runs until the user leaves or the service ends; it has no wizard steps or overall completion countdown. `Q`, Ctrl+C and terminal disconnection close only this client. A stopped service or lost connection is shown truthfully, never as continuing live activity; it does not trigger a replacement service.

Explicit interactive foreground start and finite run share this dashboard's state and control experience, but own their execution lifetime. Run ends with a truthful queue summary. In an owning foreground invocation, Ctrl+C and termination signals stop further task claims, stop only owned work and preserve recovery state. They do not kill unrelated Node processes or user browsers.

## State and presentation

Keep the running service's actual engine version, selected project, connection state and operating mode visible. Clearly identify the current agent, task and harness, with model/effort when known. Show the ordered queue or its summary, task details, results/statistics, current phase, waits, blocked/paused state and pending human requests. Idle means idle, not invented progress.

Use the shared rich terminal presentation: semantic colors, status indicators, readable panels and aligned summaries that update in place. Keep routine orchestration/tool output secondary in a bounded activity/detail view instead of flooding the main screen. Separate agent messages, checks and failures; [errors](errors.md) have an understandable summary, next action and access to diagnostic evidence. Follow [featured/More presentation](harness-plugins.md) for catalog browsing rather than dumping every provider. Always identify the active harness regardless of featured status.

The [browser dashboard](dashboard.md), terminal dashboard and [API](api.md) expose equivalent project state and [controls](controls.md), not independent queues or simulated progress. Surface outcomes and changes from any client in the others. Layout and input gestures may differ, but core information and control semantics must not.

## Controls and raw output

Show a discoverable keyboard legend. Support `P` for pause/resume, `S` to skip a pacing/backoff wait without bypassing task conditions, and `X` to request that the service finish the current task and stop (again to cancel owned work). Clearly distinguish this service-stop action from leaving an attached dashboard. `O` switches dashboard/plain presentation within an interactive session; arrow keys and End support scrolling/following activity. Give immediate feedback and preserve usability during resize. While editing or selecting, keys belong to that control rather than global shortcuts.

Raw/noninteractive use streams readable plain state and events without color, cursor sequences or input prompts. `ptbk dashboard --raw` still observes the existing service continuously; use status/show for a one-shot snapshot. Switching presentation with `O` does not resubmit work or change the interactive session's authorization/input policy. Keep output bounded and truncation visible; never invent progress, remaining time or cost.

Daemon lifecycle commands render one result and return; they do not automatically attach this view. See [process modes](process-modes.md), [channels](channels.md) and [traces](traces.md).
