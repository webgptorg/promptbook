# Lightweight localhost dashboard and REST API

[Main specification](../_main.md)

The HTTP interface belongs to the active project process, not a separate product or queue. Start enables it by default in every process mode. Find a free port automatically or use `--port`; `--no-server` disables it. Report the actual address and explicit port conflicts. When enabled for finite run, it belongs to that invocation and must not keep the queue/process running after completion.

Bind to localhost. Serve a very small page with status and controls equivalent to the [terminal dashboard](terminal.md), without React or another frontend application framework. Show the running process's actual engine version, current agent/task/harness and known model/effort, execution phase, queue, results/statistics, waits, blockers and pending requests. Page and REST API expose the same [control capabilities](controls.md); updates and answers stay synchronized with the active process.

Follow [harness presentation](harness-plugins.md): catalog browsing begins with featured names and More, with configuration/model inventories available on request rather than overwhelming the status view. Current activity is always visible even for a non-featured harness. [Errors](errors.md) include their meaning, next action and redacted diagnostic reference.

The API is another control channel, not a privileged bypass. Reject unauthorized cross-origin control requests, invalid input, stale edits and access outside the project. Do not expose secrets or browser profile contents. A page cannot control the process merely because it reaches a localhost port.

Page failure or disconnection must not stop a daemon or create a new run. Answers and control commands have visible outcomes. See [channels](channels.md), [user interactions](user-interactions.md) and [start output](start.md).
