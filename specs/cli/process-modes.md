# Process modes and lifecycle commands

[Main specification](../_main.md) · [Service state machine](service-lifecycle.md) · [Project locking](locking.md)

`ptbk start` separates engine process placement from [presentation and input policy](interactive-ui.md):

- **Daemon** (default, `--daemon`): runs in the background independently of the launching terminal and any dashboard.
- **Foreground** (`--foreground`): the launching invocation hosts the ongoing engine until it stops. A suitable terminal presents the live controls; raw/noninteractive use emits plain events. This explicit engine-hosting invocation is not an attached `ptbk dashboard` client.

Daemon and foreground are mutually exclusive. `--raw` changes output, not placement: `ptbk start --raw` still launches a daemon and returns once; `ptbk start --foreground --raw` stays foreground. `--interactive` enables appropriate interaction, not implicit foreground mode. Init and add have finite setup/authoring phases; interactive init may then attach an independent dashboard through its documented countdown.

Successful init performs the ordinary daemon start after technical setup. Its interactive countdown can attach the shared independent dashboard; raw/noninteractive use or skipping the countdown returns directly. It never becomes foreground engine ownership or waits for the first task. Reuse the same lifecycle operation when start first needs initialization; one request must not recursively create another worker. Reuse an existing service without changing its configuration or pause/draining intent. See [initialization](initialization.md).

## Engine versus observing clients

Every engine belongs to one concrete selected project directory. There is no global engine, and different installation paths/versions cannot create concurrent owners of the same project. [Exclusive project ownership](locking.md) is acquired by the engine, not by a viewer.

`ptbk dashboard` attaches a continuous terminal view to an existing project engine without initializing, starting, owning or replacing it. There may be zero, one or many simultaneous terminal/browser/API clients. Opening or leaving any of them changes neither the engine's lifetime nor its scheduling state. All clients observe the engine's state and invoke its shared control operations; they do not maintain independent queues or pause flags. A missing or unreachable selected service produces an actionable unsuccessful result with startup guidance, not implicit startup.

`ptbk dashboard --global` instead opens the independent [host-wide overview](global-dashboard.md), from any directory. It discovers existing project engines and can attach to their dashboards without `cd`. It stays open with zero entries and notices later starts. It never launches a global worker or acquires any project lock.

Every start mode supports optional HTTP, automatic/selected port and the same project/runtime state. `--no-server` disables HTTP; `--port` selects its port. Local lifecycle controls and terminal discovery must still work without HTTP. Diagnose conflicting or invalid options rather than ignoring them.

## Lifecycle operations

Start, pause, resume, stop and restart are one-shot control operations, not implicit live-dashboard attachments. Start may first use shared setup when permitted; `--non-interactive` forbids it. A detached daemon never prompts on the launching terminal. Repeated start reports the existing process without replacing its configuration or cancelling a deliberate pause/stop.

Use [the shared state machine](service-lifecycle.md) for `running`, `pausing`, `pause` and `stopping`, cancellation, graceful restart and `stop --force`/`-F`. Foreground ownership does not introduce different pause or stop semantics. Restart retains the selected installation, effective project configuration and applicable placement policy; it must not silently turn an explicitly foreground workflow into a persistent daemon.

Locate the selected engine through verified runtime information. A stale record or reused PID must not control an unrelated process. Read-only inspection may retry an abruptly closed connection within a bounded budget, authenticating the owner again. Never blindly replay a mutating command after losing its reply; report an unconfirmed outcome. A completed stop is confirmed only after that owner ends and releases ownership, not merely because its endpoint becomes unavailable. A replacement owner remains untouched.

`ptbk status` and `ptbk show` inspect version, live state, statistics, pending questions and connection details once without changing lifecycle. A stopped/disconnected display is an observation, not another live engine state. Lifecycle results distinguish accepted pending intent from completion.

An intentional completed stop suppresses automatic startup until a subsequent authorized start, including successful explicit init. Opening a dashboard or rebooting does not undo it. Cancelling a pending stop does not leave permanent-stop intent behind. Restart is not an intentional permanent stop. Terminating an owning foreground invocation preserves recoverable state without creating a background replacement; Ctrl+C on an attached dashboard only closes that client.

See [startup persistence](persistence.md), [unattended operation](autonomous-operation.md), [controls](controls.md) and [recovery](recovery.md).
