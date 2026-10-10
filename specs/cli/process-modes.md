# Process modes and lifecycle commands

[Main specification](../_main.md)

`ptbk start` supports three mutually exclusive modes:

- **Daemon** (default, `--daemon`): runs in the background independently of the launching terminal.
- **Raw** (`--raw`): foreground, noninteractive output without a terminal dashboard.
- **Interactive** (`--interactive`): foreground terminal status and controls.

Every mode supports the optional HTTP server, automatic or selected port, and the same project/runtime state. `--no-server` disables HTTP; `--port` selects its port. A conflicting or invalid option must be diagnosed rather than ignored.

For a daemon, `ptbk stop` safely stops the project's process, and `ptbk restart` restarts it with its effective project configuration. These commands locate the process through `.ptbk/` runtime information and verify its identity; a stale record must not cause an unrelated process to be controlled. Concurrent starts must not create duplicate project workers.

`ptbk status` and `ptbk show` inspect the existing process, its statistics, pending questions and connection details without starting, stopping or restarting it. Foreground processes are terminated through their own process controls; daemon-only stop/restart must clearly report when the project is running in a foreground mode.

An intentional daemon stop also suppresses automatic startup until a subsequent explicit start. A restart is not an intentional permanent stop. Foreground termination preserves recoverable state without silently creating a background replacement.

See [startup persistence](persistence.md), [terminal](terminal.md), [controls](controls.md) and [recovery](recovery.md).
