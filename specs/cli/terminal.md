# Terminal presentation

[Main specification](../_main.md)

Interactive foreground mode displays activity, queue, statistics, questions and the shared controls. Separate agent messages from orchestration, tools, checks and failures. Raw foreground mode streams readable noninteractive output without dashboard escape sequences. Neither viewing nor changing presentation resubmits a task.

Support `P` for pause/resume, `S` to skip a pacing/backoff wait without bypassing task conditions, `X` to finish the current task and exit (press again to cancel), and `O` to switch normal/raw presentation within an interactive session. Arrow keys and End support scrolling/following output. Give immediate feedback and preserve usability during resize.

Ctrl+C or termination signals stop further task claims, stop only owned work and preserve recovery state. They do not kill unrelated Node processes or user browsers. Daemon startup prints confirmation and connection instructions, then releases the terminal; `show`, `status` and `answer` reconnect to its information without recreating it.

Keep output buffers bounded and truncation visible. Never show invented progress, remaining time or cost. A disconnected terminal does not stop the daemon. See [process modes](process-modes.md), [channels](channels.md), [start output](start.md) and [traces](traces.md).
