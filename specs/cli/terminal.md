# Terminal runtime dashboard

[Main specification](../_main.md) · [Interactive UI](interactive-ui.md)

Interactive foreground start and run share a coherent live dashboard. Keep the running engine version, selected project and operating mode visible. Clearly identify the current agent, task and harness, with model/effort when known. Show the ordered queue or its summary, results/statistics, current phase, waits, blocked/paused state and pending human requests. Idle means idle, not invented progress.

Use stable, readable regions that update in place. Keep routine orchestration/tool output secondary in a bounded activity/detail view instead of flooding the main screen. Separate agent messages, checks and failures; [errors](errors.md) have an understandable summary, next action and access to diagnostic evidence. Follow [featured/More presentation](harness-plugins.md) for catalog browsing rather than dumping every provider. Always identify the active harness regardless of featured status.

Start has no overall completion countdown. Run shows the same state model but ends with a truthful finite-run summary. The optional [page/API](dashboard.md) reflect that same state, not an independent queue or simulated progress.

Support `P` for pause/resume, `S` to skip a pacing/backoff wait without bypassing task conditions, `X` to finish the current task and exit (again to cancel), and `O` to switch dashboard/raw presentation within an interactive session. Arrow keys and End support scrolling/following activity. Give immediate feedback and preserve usability during resize. While editing a text field, typing belongs to that field rather than triggering global shortcuts.

Raw/noninteractive launches stream readable plain output without dashboard escape sequences or input prompts. Switching presentation with `O` does not resubmit a task or change an interactive session's authorization/input policy. Keep output bounded and truncation visible; never invent progress, remaining time or cost.

Ctrl+C and termination signals stop further task claims, stop only owned work and preserve recovery state. They do not kill unrelated Node processes or user browsers. Daemon startup shows confirmation and connection instructions, then releases the terminal; show/status/answer inspect it without recreation. Terminal disconnection does not stop a daemon. See [process modes](process-modes.md), [channels](channels.md) and [traces](traces.md).
