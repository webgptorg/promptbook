# Persistence across system restarts

[Main specification](../_main.md)

Daemon mode is persistent by default. After successful `ptbk start`, terminal closure, unexpected process exit or OS restart restores the same project, selected installation and effective configuration without manual launch, subject to durable operator lifecycle intent.

## Restored operator intent

| Saved operator intent | Automatic recovery after crash/OS restart |
| --- | --- |
| Running, without manual pause | Restore the engine; eligible work may continue after readiness, current Health checks and work reconciliation. |
| Manual pause, including an accepted pause still draining | Restore the engine with its manual reason active before any background task can be claimed. |
| Deliberate stop, including force stop or `ptbk panic` | Keep the project stopped until explicit authorized start; retain its global registry entry. |

Persist accepted manual pause/resume changes so recovery retains the latest operator intent rather than only the aggregate observed state. Reboot during a manual pause's drain does not erase that intent. Reconcile interrupted work safely without treating reboot as new execution authorization.

**Health pause is independent.** Re-evaluate current conditions through the [Health sub-engine](health-sub-engine.md) before background claims. A historical Health-only pause does not become manual pause, and Health may clear its own reason automatically after recovery. In a combined manual + Health pause, clearing Health leaves the restored manual reason and requires manual Resume.

Deliberate stop disables automatic respawn/startup even with forced termination, an unresponsive engine or a pending replacement restart. Supervisors must not undo [panic](panic.md) as ordinary crash recovery. Later explicit individual/bulk start re-enables operation under its launch policy; opening a dashboard or rebooting does not.

These are OS/crash-recovery rules; explicit `ptbk restart` retains its separately defined [lifecycle semantics](service-lifecycle.md).

## Installation, environment and registration

Recovery preserves the existing process's invocation overrides without writing them into `ptbk.json`; a new independent invocation follows [configuration precedence](configuration.md). Report the version actually loaded after a restart. Recovery must not implicitly switch from a project-local installation to a global copy or perform an unapproved engine self-update.

Preserve the launching terminal's executable search path and non-secret native configuration/store locations in private daemon restart metadata. OS-managed startup often has a smaller PATH than an interactive shell; a globally installed authenticated harness that worked during preflight must remain discoverable after detachment, user login, crash recovery and reboot. Restore these locations before Git or harness inspection, without copying API keys, access tokens or the rest of the shell environment. Older restart metadata without saved paths must remain compatible and include the pinned Node executable's global bin directory. A fresh restart from the configured terminal refreshes discovery paths and rechecks native login; repeated start over a live process does not replace its environment or loaded code.

`--no-persist` disables automatic restart/startup registration without changing the durability of project files, browser sessions, questions or recovery records. Foreground modes stay foreground and do not implicitly install a replacement daemon.

Support Linux, macOS and Windows, global/project-local installations and desktop/headless hosts. State operating-system permission or account-session prerequisites accurately. If persistence cannot be established, report that startup is not persistent and give a concrete resolution; never claim a guarantee that was not installed.

Startup registration is scoped to the correct project/user and does not duplicate on repeated starts. It is distinct from the [durable known-project registry](global-dashboard.md): disabling startup, using `--no-persist` or stopping does not forget the project. Deliberately stopped projects stay stopped. Missing paths, unavailable installations and expired authentication become visible recoverable conditions, not execution against another directory or identity.

Reconcile previous work before continuing; restart is not permission to repeat completed work or external actions. See [process modes](process-modes.md), [updates](updates.md) and [recovery](recovery.md).

## Acceptance outcomes

On Linux, macOS and Windows, reboot/recover a running daemon, a manually paused daemon and a daemon with manual pause still draining. Restore operator intent before new background claims; paused engines remain inspectable without running queued work. Resume manually and verify that updated intent survives later recovery.

Recover a Health-only pause after resources improve: Health may clear it automatically. Recover combined manual + Health pause: resource recovery preserves manual pause. Graceful stop, force stop and panic remain stopped through supervisor retries/reboot, with projects listed globally until explicitly removed. Explicit start works; no-persist/foreground placement and selected installation/environment remain correct.
