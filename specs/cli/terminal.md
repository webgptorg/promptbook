# Terminal and run controls

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

An interactive run starts in Normal output. Separate the agent's own messages from runner statuses, commands, tools, file changes, checks and errors. Raw output shows the original stream. Switching modes does not resubmit the prompt or call a model; the selection applies throughout the invocation rather than globally.

- `P`: Pause/resume at safe boundaries. Pause starts no further work; clearly show a pending pause for the running phase.
- `S`: Skip the current pacing/backoff/poll wait only when that is the current waiting state; never bypass not-before/trigger conditions.
- `X`: Finish the current task and then exit; a second press cancels the request.
- `O`: Toggle normal/raw output without restarting the harness.
- **Arrow keys, End**: Scroll the buffer / return to following live output.
- **Ctrl+C / SIGTERM**: Stop claiming, terminate only owned subprocesses, save recovery state and release resources.

Every key must give immediate feedback, including when there is nothing to skip. Resize must neither break the panel nor create load proportional to the entire history. Non-TTY and `--no-ui` modes provide readable ongoing output without dashboard escape sequences.

Preserve bounded buffers: the current raw limit of 256,000 characters / 2,048 chunks and normal limit of 160 items with at most 8,000 characters each may be compatible defaults. Label truncation. Show progress, ETA, cost and quota only from observed data/labeled estimates; do not display fictitious percentages.

## Related specifications

- [Persistent mode and dashboard](server.md)
- [Not-before: earliest start](not-before.md)
- [Execution lifecycle](execution.md)
- [Traces and results](traces.md)
