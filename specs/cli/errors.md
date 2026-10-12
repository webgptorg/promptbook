# Errors and actionable diagnostics

[Main specification](../_main.md)

Use one error experience across init, start, run and service commands. An error explains what failed, the affected project and task/step or harness, the known reason, the effect on current work, what was preserved and what the user can do next. Distinguish an observed cause from an unknown cause; a bare exception string or stack dump is not sufficient.

Interactive UI presents a concise failure summary with suitable actions and an explicit route to technical details. Keep it visible while relevant, without letting repeated errors flood the dashboard or overwrite text input. Noninteractive output contains the same actionable facts in plain text and an accurate command outcome.

Record diagnostic evidence for startup, configuration, installation, updates, orchestration, harness, check and persistence failures, including failures before a task exists. Include the running engine version, relevant harness version, failed phase, exposed exception/stack and process diagnostics where available. Give a trace reference/path that actually exists. Preserve failed-attempt evidence across retries and restarts, with secret redaction.

Read-only commands do not create project trace storage. If normal project trace storage is not yet available or writing it fails, explain that and emit available redacted diagnostics to stderr; never promise a saved trace that was not written. Diagnostic failure must not hide the original failure.

Classify next steps: invalid setup requires correction, authentication requires native login, quota can wait, and safe technical failures can retry within the existing budgets. Never repeat successful model work merely to retry a commit or push. Start remains inspectable while blocked; finite commands terminate with a clear unsuccessful result when they cannot continue.

See [traces](traces.md), [retries](retries.md), [recovery](recovery.md) and [interactive UI](interactive-ui.md).
