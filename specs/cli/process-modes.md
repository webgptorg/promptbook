# Process modes and lifecycle commands

[Main specification](../_main.md)

`ptbk start` supports three mutually exclusive process modes:

- **Daemon** (default, `--daemon`): runs in the background independently of the launching terminal.
- **Raw** (`--raw`): foreground, noninteractive output without a terminal dashboard.
- **Interactive** (`--interactive`): foreground terminal dashboard and controls.

These modes do not replace the tool-wide [interactive/noninteractive contract](interactive-ui.md). A daemon itself never prompts on the launching terminal after detaching, but its interactive launch may first use the shared setup wizard. `--non-interactive` forbids that launch-time wizard as well. Run has the same interactive dashboard or noninteractive output choices but retains its finite lifetime; init remains a finite wizard.

Every start mode supports the optional HTTP server, automatic or selected port, and the same project/runtime state. `--no-server` disables HTTP; `--port` selects its port. Diagnose conflicting or invalid options rather than ignoring them.

For a daemon, `ptbk stop` safely stops the project's process, and `ptbk restart` restarts it with its effective project configuration. Locate it through `.ptbk/` runtime information and verify its identity; stale records must not control unrelated processes. Concurrent starts must not create duplicate workers.

`ptbk status` and `ptbk show` inspect the existing process, version, statistics, pending questions and connection details without changing its lifecycle. Foreground processes use their own process controls; daemon-only stop/restart clearly report a foreground project.

An intentional daemon stop suppresses automatic startup until a subsequent explicit start. Restart is not an intentional permanent stop. Foreground termination preserves recoverable state without creating a background replacement.

See [startup persistence](persistence.md), [terminal](terminal.md), [controls](controls.md) and [recovery](recovery.md).
