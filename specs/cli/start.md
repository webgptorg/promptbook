# Starting an ongoing agenda

[Main specification](../_main.md) · [Unattended operation](autonomous-operation.md) · [Automatic repair](../concepts/automatic-repair.md)

`ptbk start` operates the project's agenda indefinitely without per-task agent/harness/model/thinking selection. Successful [init](initialization.md) calls the same background start. Except for direct/automatic paused launches, a ready project starts actual processing without another work-launch action, with concurrent task/chat work under the shared [capacity and per-file ownership contract](concurrency.md), not a permanent unbounded worker per agent.

## Start directly paused

`ptbk start --paused` launches an absent service with manual pause active before any background claim. Dashboard/API/control and explicit chat remain usable; no bootstrap, assignment, repair, teaching, discovery or report task starts. The normal interactive dashboard handoff/opt-outs still apply. Repeated start of a live owner retains its state. Automatic [OS startup](persistence.md) uses this same path for manually paused/stopped/force-stopped/panic projects; only prior running/Health-only agendas may restore work after checks. Unexpected process loss does not authorize work resumption.

## Readiness is not service existence

Check project configuration compatibility and apply required [migrations](configuration-migrations.md) before affected work. An engine older than the saved version explains/offers its update rather than downgrading the project. Ensure required core roles through the same [preparation/update operation](../agents/core-agents.md#shared-preparation-and-template-updates) as init: add missing roles without another wizard and reconcile template updates while preserving project edits, using ordinary Fixer work for conflicts when scheduling permits; a paused launch defers that work without a brief queue start. For genuinely missing structural initialization, reuse the same finite initializer when interactive, preserving prior choices and one setup/start handoff; noninteractive use reports missing decisions without hidden prompts.

An initialized project whose tools are missing, disabled, signed out, quota-limited or otherwise unusable may still start its supervisor and controls. Show **running, waiting for tools**, with the precise missing resource and enable/add/repair action. Do not rerun onboarding to reverse a deliberate removal. Check the live inventory before every task and keep refreshing while idle; new tools resume work without restart and can help an existing task. See [tool runtime](tool-runtime.md).

There is no check-command setup question at start. Preserve real checks; the explicit initialization placeholder is nonblocking and visibly not real automated validation. A broken real validator uses ordinary repair rather than a new wizard or a replacement fake pass. Successful unchanged init needs no repeated login, check selection or task creation.

## Launch result and dashboard handoff

Default start launches a background daemon with restart persistence and a lightweight loopback HTTP service on a free port searched from 3000. Serve only this computer with the [local API safeguards](api.md#independence-and-security); `--no-server` disables HTTP while retaining local engine control. Starting never installs a tunnel client or contacts a dashboard relay. Starting/serving the service and attaching a viewer remain separate operations internally, but ordinary interactive `ptbk start` performs both in sequence.

Discover agents with the shared resolver and enabled named tools with the shared registry. Attach/start each enabled browser's [profile pool](browser.md) at engine startup rather than waiting for its first task; a browser failure is a resource wait, not failure of the whole service. Wallet unlock uses protected host credentials without a reboot prompt. Reuse global harness setup and apply [update policy](harness-updates.md) safely across shared executables. Installed unselected harnesses are not implicit choices. Referenceable hidden/dependency agents are not automatically goal-discovery candidates. The launching terminal may complete genuinely missing attended initialization before detaching, not hide runtime decisions on stdin.

After a bounded successful daemon launch, an ordinary suitable interactive terminal **automatically attaches the ordinary project dashboard** and keeps that viewer open. This is the same independent viewer as `ptbk dashboard`; leaving it keeps the daemon running.

This automatic attachment also happens when `ptbk start` discovers that the selected engine is already running. Repeated start therefore remains idempotent for engine state while still being a convenient "start-or-open" command.

`--no-dashboard` suppresses the automatic viewer and returns after the bounded start/existing-service result. Raw/`--no-ui`, `--non-interactive`, redirected or otherwise unsuitable terminal use also returns without attaching. These presentation choices do not change daemon lifetime or HTTP enablement.

Explicit `--foreground` already owns its live foreground view and does not open a second attached dashboard; raw foreground emits plain events. Report truthful launch state before/within the handoff and never wait for the first task result.

Connection information reports the actual loopback address and readiness for this computer. Respect raw output and local authentication controls; hint `ptbk dashboard`, `ptbk show` and `ptbk stop`. Do not wait for the first task. Init's finite finish uses its separate [UX](initialization-ui.md).

## Automatic progression and synchronization

Evaluate the queue at startup, after work and after relevant source/tool changes. Execute eligible assigned tasks, including Expert bootstrap. Missing routing creates an ordinary checked [Router](../agents/core-agents/router.md) prerequisite, then continues with its target, without manual assignment, recursion or duplicates. Explicit unavailable requirements remain real waits. All background task claims require running lifecycle state and current usable tools. Future-task routing is separately eligible according to target priority/urgency, not delayed until the target date. Chat and its required routing remain available during other task execution and scheduling pause.

Before new work and before its commit, attempt opt-in [Git synchronization](git-synchronization.md), in addition to the 60-second background cycle. Publish completed local operations when enabled. Failed pull/push leaves synchronization pending, not the task queue artificially stopped. Preserve owned dirty work and defer unsafe integration; newly fetched tasks/configuration become effective only after safe integration and validation.

Authoring normally commits sources before dispatch; explicit ordinary `--no-commit` is the labelled exception under [Git persistence](git-persistence.md), not an excuse to mix unrelated dirt or skip required committed migrations. When no unfinished work remains, including future tasks, perform due [goal discovery](goal-discovery.md) with persistent cooldowns. Do not generate useless work merely to avoid idle time.

Follow [automatic repair](../concepts/automatic-repair.md) as a core principle: deterministic retries/corrections and ordinary Fixer work resolve routine issues without needless user decisions. Fixer is not a special worker or channel; its current Book/TEAM controls consultations. Checkpoint task-local blockers and continue independent eligible work when safe, while preserving one owner per affected file and respecting pause/stop. No usable harness also means Fixer cannot execute yet; retain the visible resource wait.

Survive ordinary task/check/provider/browser/update/synchronization/persistence failures with bounded recovery, useful traces and controls. Empty queues or missing resources do not mean service exit. Deliberate pause/stop remains authoritative. The product targets extended unattended operation, not guaranteed work while a host sleeps or external accounts are unavailable.

Repeated start never creates duplicate workers, reinitializes, silently replaces configuration or cancels pause reasons. In ordinary interactive daemon mode it attaches the existing engine's dashboard; with `--no-dashboard`/raw/noninteractive presentation it reports once and returns. `ptbk dashboard` remains the explicit manual attachment command. See [controls](controls.md), [persistence](persistence.md), [process modes](process-modes.md) and [execution](execution.md).
