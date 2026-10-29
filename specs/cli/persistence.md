# Persistence across system restarts

[Main specification](../_main.md)

Daemon mode is persistent by default. Separate **service availability** from **authorization to execute background work**. Terminal closure leaves the daemon alone. OS startup restores every still-registered persistent project using the same project, selected installation and effective configuration, with the work intent below. No-persist and foreground choices remain explicit opt-outs.

## Restored operator intent

| Last state/intent before OS restart | Automatic startup |
| --- | --- |
| Running, no manual pause/stop | Restore service; eligible work may continue after readiness, current Health and safe reconciliation. |
| Health-only pause | Restore without a manual reason; recheck Health. Work may resume if cleared, otherwise pause for current Health. |
| Manual pause/draining, with or without Health | Start directly paused, with manual intent active before any task claim. |
| Stopped, force-stopped, panic or pending shutdown | Start directly paused for inspection/control, never automatically resume the agenda. |
| Unexpected disappearance or ambiguous external kill | Do not infer work authority from an old running record; any restored service is paused. |

All inactive outcomes can restore as the same paused service; preserving whether it was stopped versus force-stopped is unnecessary. Dashboard/API/local controls and explicit chat remain available, but no queued bootstrap, Router assignment, Fixer, Teacher, discovery, report or other background task starts. This adds no remote transport or weaker API security.

Persist accepted manual pause/resume changes so recovery retains the latest operator intent rather than only the aggregate observed state. Reboot during a manual pause's drain does not erase that intent. Reconcile interrupted work safely without treating reboot as new execution authorization.

**Health pause is independent.** Re-evaluate current conditions through the [Health sub-engine](health-sub-engine.md) before background claims. A historical Health-only pause does not become manual pause, and Health may clear its own reason automatically after recovery. In a combined manual + Health pause, clearing Health leaves the restored manual reason and requires manual Resume.

Deliberate stop/force stop/panic ends the actual process now and cancels immediate watchdog/pending replacement starts. Keep enabled startup registration: the **next OS reboot** launches it paused, not running work. A later explicit Start can launch sooner; Resume of a restored paused service removes only manual intent subject to Health. Opening a dashboard never starts/resumes work. Unexpected process exit or an external kill cannot be distinguished reliably from intentional termination: do not autonomously resume work; any supervisor-restored availability is paused. Explicit requested restart retains its separate replacement contract.

These are OS/crash-recovery rules; explicit `ptbk restart` retains its separately defined [lifecycle semantics](service-lifecycle.md).

## Installation, environment and registration

Recovery preserves the existing process's invocation overrides without writing them into `ptbk.json`; a new independent invocation follows [configuration precedence](configuration.md). Report the version actually loaded after a restart. Recovery must not implicitly switch from a project-local installation to a global copy or perform an unapproved engine self-update.

Preserve the launching terminal's executable search path and non-secret native configuration/store locations in private daemon restart metadata. OS-managed startup often has a smaller PATH than an interactive shell; a globally installed authenticated harness that worked during preflight must remain discoverable after detachment, user login, crash recovery and reboot. Restore these locations before Git or harness inspection, without copying API keys, access tokens or the rest of the shell environment. Older restart metadata without saved paths must remain compatible and include the pinned Node executable's global bin directory. A fresh restart from the configured terminal refreshes discovery paths and rechecks native login; repeated start over a live process does not replace its environment or loaded code.

`--no-persist` disables automatic restart/startup registration without changing the durability of project files, browser sessions, questions or recovery records. Foreground modes stay foreground and do not implicitly install a replacement daemon.

Support Linux, macOS and Windows, global/project-local installations and desktop/headless hosts. State operating-system permission or account-session prerequisites accurately. If persistence cannot be established, report that startup is not persistent and give a concrete resolution; never claim a guarantee that was not installed.

Detached/recovered launches retain the original intended OS-user scope under the [home/sudo policy](workspace.md#home-directory-and-shared-projects-root), not whichever HOME the process inherits. Startup registration is scoped to the correct project/user and does not duplicate on repeated starts. It is distinct from the [durable known-project registry](global-dashboard.md): disabling startup, using `--no-persist` or stopping does not forget the project. Stopped projects retain enabled registration for paused next-boot startup. Forgetting a verified stopped registry entry also removes associated startup registration, preserving all project data. Missing paths, unavailable installations and expired authentication become visible recoverable conditions, not execution against another directory or identity.

Reconcile previous work before continuing; restart is not permission to repeat completed work or external actions. Website credentials also retain unattended startup through [Wallet](wallet.md)/[project encryption](project-encryption.md): host-protected automatic unlock works without recovery-word/master-password prompts after reboot. Never copy raw keys or recovery words into restart metadata. A missing host binding requests one protected restoration and blocks only affected login work.

See [process modes](process-modes.md), [updates](updates.md) and [recovery](recovery.md).

## Acceptance outcomes

On Linux/macOS/Windows reboot a mixed persistent registry: previously running/Health-only services may work after current checks; manual/combined pause, stop, force stop, panic and ambiguous loss restore paused before even one background claim. Fifty stopped prepared projects become inspectable without executing tasks. Explicit Resume updates future intent.

Health-only conditions are re-evaluated; combined/manual pause stays paused. Stop/panic prevents immediate supervisor replacement. Unexpected worker exit never automatically resumes work. Removed entries, no-persist and foreground opt-outs do not acquire persistent daemons. Preserve pinned installation/environment, data and unattended host-protected Wallet unlock.
