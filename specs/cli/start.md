# Starting an ongoing agenda

[Main specification](../_main.md)

`ptbk start` is the primary product workflow. It operates the selected project's agenda indefinitely without requiring per-task agent, harness, model or thinking-level selection. A project has one active task at a time, not one concurrent worker per agent.

Before execution, inspect initialization and readiness. For a missing or partial setup, explain what is missing and offer the same [initialization workflow](initialization.md) when interactive, with the already-selected project as its destination. Preserve completed steps and existing choices, then recheck readiness. A ready project does not repeat onboarding. Raw/noninteractive startup reports missing prerequisites and the explicit init/configuration action instead of launching hidden prompts or pretending to be ready.

With no flags, start a background daemon, enable restart persistence and expose the lightweight localhost dashboard on an automatically chosen free port, searching from 3000. An interactive launching terminal may complete missing setup before detaching. Discover project agents and only project-enabled harnesses for routing, reuse their global setup and apply the configured [harness-update policy](harness-updates.md). Unselected installed harnesses are not implicit candidates.

Interactive foreground operation uses the [live terminal dashboard](terminal.md), not a scrolling system log or a wizard with an eventual completion estimate. Raw mode emits plain events. The page/API show the same actual state and running engine version.

After successful startup, show engine version, confirmation, project identity, the actual dashboard URL and a clearly rendered, scannable terminal QR code for that URL. Include useful next commands such as `ptbk show` and `ptbk stop`. `--no-qr` suppresses the code. Do not display it when HTTP is disabled or failed to start. A localhost QR code does not imply access from another device.

Uncommitted or invalid initial state may prevent startup. Once running, survive ordinary task, check, provider, update and persistence failures: recover automatically when safe, otherwise stay inspectable in a visible blocked/paused state with [actionable errors and traces](errors.md). Do not exit merely because the queue is empty or a task fails. The intended operating duration is months without routine manual restarts.

Respect explicit routing and let [Manager](../agents/manager.md) fill missing choices among enabled, usable harnesses. Complete and commit tasks serially. With no unfinished work, including future work, use [goal discovery](goal-discovery.md). Waiting does not require continuous model calls.

Repeated start finds the existing process and shows/connects to it, without a second supervisor, repeat initialization or silent configuration replacement. See [controls](controls.md), [dashboard](dashboard.md), [persistence](persistence.md), [process modes](process-modes.md) and [run](run.md).
