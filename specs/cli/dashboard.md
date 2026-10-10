# Lightweight localhost dashboard and REST API

[Main specification](../_main.md)

The HTTP interface belongs to the process started by `ptbk start`; it is not a separate product or queue. It is enabled by default in every process mode. Find a free port automatically or use `--port`; `--no-server` disables it. Report the actual address and explicit port conflicts.

Bind to localhost. Serve a very small page with status and controls equivalent to the terminal, without React or another frontend application framework. The page and simple REST API expose the same [control capabilities](controls.md), current task, ordered queue, agents, harness/model availability, statistics and pending user requests. Updates and answers must remain synchronized with the active process.

The API is another control channel, not a privileged bypass. Reject unauthorized cross-origin control requests, invalid input, stale edits and access outside the project. Do not expose secrets or the browser profile. A browser page must not be able to control the process merely because it can reach a localhost port.

Failure or disconnection of a page must not stop a daemon or create a new run. User answers and control commands must have visible outcomes. See [channels](channels.md), [user interactions](user-interactions.md) and [start output](start.md).
