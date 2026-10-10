# Starting an ongoing agenda

[Main specification](../_main.md)

`ptbk start` is the primary product workflow. Over an initialized or cloned project it starts all eligible project work without requiring the user to select an agent, harness, model or thinking level. A project has one active task at a time, not one concurrent worker per agent.

With no flags, start a background daemon, enable restart persistence and expose the lightweight localhost dashboard on an automatically chosen free port, searching from 3000. Discover available harnesses, their models and all project agents. If no usable harness exists, guide installation/login before detaching; unattended startup reports the missing setup instead of pretending to be ready.

After successful startup, print confirmation, project identity, the actual dashboard URL and a clearly rendered, scannable terminal QR code for that same URL. Include useful next commands, such as `ptbk show` and `ptbk stop`. `--no-qr` suppresses the code. Do not display a dashboard QR code when the HTTP server is disabled or failed to start. A localhost QR code does not imply access from another device.

Uncommitted or invalid initial state may prevent startup. Once running, the supervisor must survive ordinary task, check, provider and persistence failures: recover automatically when safe, otherwise remain available in a visible blocked/paused state. It must not exit merely because the queue is empty or a task fails. The intended operating duration is months without routine manual restarts.

For each task, respect explicit routing and let [Manager](../agents/manager.md) fill missing choices. Complete and commit tasks serially. When no unfinished work exists, including future work, use [goal discovery](goal-discovery.md). Waiting does not require continuous model calls.

Repeated `start` over the same project finds the existing process and shows/connects to it rather than starting a second supervisor. It must not silently replace that process's settings. `stop`, `restart` and inspection are defined in [process modes](process-modes.md).

See [controls](controls.md), [dashboard](dashboard.md), [persistence](persistence.md) and [run](run.md).
