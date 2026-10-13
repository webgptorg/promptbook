# Starting an ongoing agenda

[Main specification](../_main.md)

`ptbk start` is the primary product workflow. It operates the selected project's agenda indefinitely without requiring per-task agent, harness, model or thinking-level selection. Starting a ready project starts actual task processing, not just a daemon and HTTP server waiting for another Run action. A project has one active task at a time, not one concurrent worker per agent.

Before execution, inspect initialization and readiness. For a missing or partial setup, explain what is missing and offer the same [initialization workflow](initialization.md) when interactive, with the already-selected project as its destination. Preserve completed steps and existing choices, then recheck readiness. After successful init, unchanged prerequisites require no more onboarding, harness login, check selection or task creation. Raw/noninteractive startup reports missing prerequisites and the explicit init/configuration action instead of launching hidden prompts or pretending to be ready.

An unresolved project check enters the shared validation setup step even when every setup artifact already exists. Preserve valid checks and use supplied `--check` overrides for this invocation. A confirmed missing check becomes a saved project default; deferral leaves the service unstarted. Noninteractive startup identifies `ptbk.json.execution.check` and `ptbk init --check COMMAND` as concrete repair paths. Never treat the generated failing placeholder as working validation.

With no flags, start a background daemon, enable restart persistence and expose the lightweight localhost dashboard on an automatically chosen free port, searching from 3000. An interactive launching terminal may complete missing setup before detaching. Discover project agents and only project-enabled harnesses for routing, reuse their global setup and apply the configured [harness-update policy](harness-updates.md). Unselected installed harnesses are not implicit candidates.

The default launch is a one-shot command: after startup, render one polished outcome and release the terminal while the service continues in the background. Do not automatically attach a live dashboard. `--raw` changes this result to plain text without changing the daemon lifetime. Explicit `--foreground` keeps execution attached, using the [live terminal dashboard](terminal.md) when interactive or plain events otherwise. The browser/API show the same actual state and running service version.

After successful startup, show engine version, confirmation, project identity, the actual dashboard URL and, in pretty output on a capable terminal, a clearly rendered, scannable QR code for that URL. Include useful next commands such as `ptbk dashboard`, `ptbk show` and `ptbk stop`. `--no-qr` suppresses the code; raw output retains the textual URL without the code. Do not display a URL or QR code for HTTP that is disabled or failed to start. A localhost QR code does not imply access from another device.

## Automatic work progression

Begin queue evaluation as part of startup and after each completed task, without waiting for a dashboard client. Execute eligible assigned tasks, including init's [first task](first-task.md). For otherwise actionable tasks with missing routing, create and execute [Manager](../agents/manager.md) prerequisites automatically, then continue with their targets. Missing `TASK AGENT` is not a terminal blocker or a user assignment request; unavailable explicit requirements remain real blockers. Assignment and target work are serial, checked and committed, with no recursive Manager bootstrap or duplicate prerequisites.

When no unfinished work remains, including future work, automatically enter due [goal discovery](goal-discovery.md). Execute useful generated tasks in the same session. Respect persisted cooldowns, future conditions, pauses and actual human/safety requirements. A running service is never unexplained inactivity: show the current task, automatic assignment/discovery, or the concrete reason for waiting and next action/opportunity when known. Do not manufacture progress or useless work to avoid legitimate idle time.

Uncommitted or invalid initial state may prevent startup. Once running, survive ordinary task, check, provider, update and persistence failures: recover automatically when safe, otherwise stay inspectable in a visible blocked/paused state with [actionable errors and traces](errors.md). Do not exit merely because the queue is empty or a task fails. The intended operating duration is months without routine manual restarts.

Repeated start finds and reports the existing process once, without a second supervisor, repeat initialization, silent configuration replacement or dashboard attachment. Use `ptbk dashboard` to observe it continuously. See [controls](controls.md), [dashboard](dashboard.md), [persistence](persistence.md), [process modes](process-modes.md) and [run](run.md).
