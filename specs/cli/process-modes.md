# Process modes and lifecycle commands

[Main specification](../_main.md)

`ptbk start` separates process placement from [presentation and input policy](interactive-ui.md):

- **Daemon** (default, `--daemon`): runs in the background independently of the launching terminal.
- **Foreground** (`--foreground`): the launching invocation owns the ongoing process until it stops. A suitable terminal uses the live dashboard; raw/noninteractive use emits plain events.

Daemon and foreground are mutually exclusive. `--raw` changes output, not process placement: `ptbk start --raw` still launches a daemon and returns once; `ptbk start --foreground --raw` stays in the foreground. `--interactive` enables appropriate terminal interaction, not an implicit foreground mode. Run remains finite foreground execution; init and add remain finite authoring/setup workflows.

Start, stop and restart normally perform one daemon operation, show a single pretty or raw outcome, then exit. Start may first use the shared setup wizard when permitted; `--non-interactive` forbids it. A detached daemon never prompts on the launching terminal. Repeated start reports the existing process without attaching a dashboard, creating another worker or replacing its configuration.

`ptbk dashboard` attaches a continuous terminal view to the selected project's existing process without starting or taking ownership of it. Closing, interrupting or disconnecting this client leaves the service running; stopping the service is a separate explicit control. A missing or unreachable process produces an actionable diagnostic, not implicit initialization or startup. See [terminal dashboard](terminal.md).

Every start mode supports the optional HTTP server, automatic or selected port, and the same project/runtime state. `--no-server` disables HTTP; `--port` selects its port. Diagnose conflicting or invalid options rather than ignoring them.

For a daemon, `ptbk stop` safely stops the project's process, and `ptbk restart` restarts it with its effective project configuration. Locate it through `.ptbk/` runtime information and verify its identity; stale records must not control unrelated processes. Concurrent starts must not create duplicate workers.

Read-only inspection may retry an abruptly closed control connection within a bounded budget, authenticating the current process record again before each attempt. Never replay a mutating command when its reply is lost; report that its outcome is unconfirmed. Stop succeeds only after the selected supervisor releases project ownership, not merely because its endpoint is unavailable. A replacement process or owner must remain untouched.

`ptbk status` and `ptbk show` inspect the existing process, version, statistics, pending questions and connection details once without changing its lifecycle. Foreground processes use their own process controls; daemon-only stop/restart clearly report a foreground project.

An intentional daemon stop suppresses automatic startup until a subsequent explicit start. Restart is not an intentional permanent stop. Foreground termination preserves recoverable state without creating a background replacement.

See [startup persistence](persistence.md), [controls](controls.md) and [recovery](recovery.md).
