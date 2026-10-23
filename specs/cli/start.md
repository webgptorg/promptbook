# Starting an ongoing agenda

[Main specification](../_main.md) · [Unattended operation](autonomous-operation.md) · [Automatic repair](../concepts/automatic-repair.md)

`ptbk start` operates the project's agenda indefinitely without per-task agent/harness/model/thinking selection. Successful [init](initialization.md) calls the same background start. A ready project starts actual processing without another Run action, with one executing task at a time, not a concurrent worker per agent.

## Readiness is not service existence

Check project configuration compatibility and apply required [migrations](configuration-migrations.md) before affected work. An engine older than the saved version explains/offers its update rather than downgrading the project. For genuinely missing structural initialization, reuse the same finite initializer when interactive, preserving prior choices and one setup/start handoff; noninteractive use reports missing decisions without hidden prompts.

An initialized project whose tools are missing, disabled, signed out, quota-limited or otherwise unusable may still start its supervisor and controls. Show **running, waiting for tools**, with the precise missing resource and enable/add/repair action. Do not rerun onboarding to reverse a deliberate removal. Check the live inventory before every task and keep refreshing while idle; new tools resume work without restart and can help an existing task. See [tool runtime](tool-runtime.md).

There is no check-command setup question at start. Preserve real checks; the explicit initialization placeholder is nonblocking and visibly not real automated validation. A broken real validator uses ordinary repair rather than a new wizard or a replacement fake pass. Successful unchanged init needs no repeated login, check selection or task creation.

## Launch and one-shot result

Default start launches a background daemon with restart persistence and a lightweight loopback HTTP service on a free port searched from 3000. Establish the usual protected [remote dashboard access](remote-access.md), with `--no-tunnel` for local only and `--no-server` for neither. This tunnel is distinct from Git autosync. Tunnel/network failures are visibly degraded and retried without unnecessarily preventing safe local work. Serving a dashboard does not open it.

Discover agents with the shared resolver and enabled named tools with the shared registry. Reuse global harness setup and apply [update policy](harness-updates.md) safely across shared executables. Installed unselected harnesses are not implicit choices. Referenceable hidden/dependency agents are not automatically goal-discovery candidates. The launching terminal may complete genuinely missing attended initialization before detaching, not hide runtime decisions on stdin.

After a bounded launch outcome, render one [status snapshot](status-view.md) and release the terminal. Do not attach/open a dashboard automatically. `--raw` changes output, not daemon lifetime/tunneling. Explicit `--foreground` owns the live execution view or plain events. Report the actual running version, project, phase/wait, queue, attributed user chats, tools and enabled synchronization summary.

Connection information distinguishes a ready public HTTPS/pairing address from local-only or connecting/degraded remote access. Do not show a localhost mobile QR as if it worked from another network. Respect no-QR/raw/authentication controls; hint `ptbk dashboard`, `ptbk show` and `ptbk stop`. Do not wait for the first task. Init's finite finish uses its separate [UX](initialization-ui.md).

## Automatic progression and synchronization

Evaluate the queue at startup, after work and after relevant source/tool changes. Execute eligible assigned tasks, including Expert bootstrap. Missing routing creates an ordinary checked [Router](../agents/core-agents/router.md) prerequisite, then continues with its target, without manual assignment, recursion or duplicates. Explicit unavailable requirements remain real waits. All background task claims require running lifecycle state and current usable tools. Future-task routing is separately eligible according to target priority/urgency, not delayed until the target date. Chat and its required routing remain available during other task execution and scheduling pause.

Before new work and before its commit, attempt opt-in [Git synchronization](git-synchronization.md), in addition to the 60-second background cycle. Publish completed local operations when enabled. Failed pull/push leaves synchronization pending, not the task queue artificially stopped. Preserve owned dirty work and defer unsafe integration; newly fetched tasks/configuration become effective only after safe integration and validation.

Authoring normally commits sources before dispatch; explicit ordinary `--no-commit` is the labelled exception under [Git persistence](git-persistence.md), not an excuse to mix unrelated dirt or skip required committed migrations. When no unfinished work remains, including future tasks, perform due [goal discovery](goal-discovery.md) with persistent cooldowns. Do not generate useless work merely to avoid idle time.

Follow [automatic repair](../concepts/automatic-repair.md) as a core principle: deterministic retries/corrections and ordinary Fixer work resolve routine issues without needless user decisions. Fixer is not a special worker or channel; its current Book/TEAM controls consultations. Checkpoint task-local blockers and continue independent eligible work when safe, while keeping one task owner and respecting pause/stop. No usable harness also means Fixer cannot execute yet; retain the visible resource wait.

Survive ordinary task/check/provider/browser/tunnel/update/synchronization/persistence failures with bounded recovery, useful traces and controls. Empty queues or missing resources do not mean service exit. Deliberate pause/stop remains authoritative. The product targets extended unattended operation, not guaranteed work while a host sleeps or external accounts are unavailable.

Repeated start reports the existing engine once without duplicate workers/tunnels, reinitialization, silent configuration replacement or pause cancellation. Use `ptbk dashboard` to observe it. See [controls](controls.md), [persistence](persistence.md), [process modes](process-modes.md) and [run](run.md).
