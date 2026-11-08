# Keeping the engine host awake

[Main specification](../_main.md) · [System page](dashboard-details.md#system-page) · [Service lifecycle](service-lifecycle.md) · [Unattended operation](autonomous-operation.md)

An operator can keep a physical computer awake for unattended work by an opted-in Promptbook engine. The first release must support a MacBook on external power with its lid closed and no external monitor, without a separate keep-awake app. The system may turn off the display and lock the session while the engine continues to run.

## Local preference and live request

The project engine evaluates the policy and owns its live OS power request. The Node.js engine can invoke an OS adapter or a narrowly scoped native helper even with zero clients and without Electron. The [host-wide project registry](global-dashboard.md#durable-registry-and-live-discovery) identifies projects for discovery and reporting. If an adapter needs a shared helper, it holds the underlying protection only while at least one eligible engine requests it. Each engine releases only its own request. Opening or closing a terminal, desktop window or tray client has no effect.

Store the selected mode and closed-lid choice in private host metadata keyed by the canonical project directory and the [intended OS user](workspace.md#home-directory-and-shared-projects-root). Keep it with the local registry data outside the project checkout and Git. A project at a new path or on a different host starts off. Store the preference independently from process identity and the current OS request.

| Mode | Behavior |
| --- | --- |
| **Off** | Default. Release any request for this engine. |
| **For a limited time** | Offer a two-hour session on external power. Save its expiry as an absolute time so a pause, battery interval or restart cannot extend it. Release at expiry and show Off. |
| **Always on external power** | Explicit opt-in for unattended operation. Remember the choice across engine restarts, upgrades and sign-in. An empty queue or long inactivity never expires it. |

On a capable host, an enabled engine in `running` holds protection throughout execution and waits, including an empty queue or time between recurring tasks. The host must report external power for either enabled mode. Unplugging or losing a reliable power reading releases the request and preserves the selected mode. Re-evaluate when external power returns, or on the next wake if the host has already slept. There is no automatic wake guarantee.

An existing request may cover checkpointing while `pausing` or `stopping` until that transition completes. Completing Pause for any reason releases the request, including when the paused engine can still serve explicit chat. Reacquire only when the engine actually returns to `running` and the power, mode and capability checks pass. Stop releases before exit. Disabling protection, expiry, loss of external power and force stop revoke it even during a transition. An engine started directly paused acquires nothing. If the last request is released, OS power policy determines whether the host sleeps, and remote chat and Resume require a reachable host.

Tie live requests to verified engine ownership and lifetime so crashes, force stops and PID reuse cannot leave an orphan inhibitor. Serialize changes with lifecycle and power events. A stale helper response cannot reacquire protection after it has been revoked.

## System controls and status

Place **Keep awake** under **System → Power** in the interactive terminal dashboard and the local desktop app. The local browser dashboard and noninteractive `ptbk` command use the same engine operations and status. The controls describe power on the engine host. Opening the page never activates protection. An operator can change the mode or turn it off while the engine is paused without acquiring a request until it runs.

Show the saved choice separately from observed protection, with the current power source and an expiry where applicable. Show idle-sleep protection and closed-lid protection separately, including when the lid follows OS policy. For inactive or degraded protection, explain the reason, such as Paused, Waiting for external power, Local approval required, Unsupported or an adapter failure. An unreachable engine's last observation is historical. Show which verified projects are currently holding protection in the global dashboard. Show when the project last did task or chat work, or that no activity is known, so the operator can notice an idle project and decide whether to turn it off. Idle reporting is passive and independent of [sounds and notifications](notifications.md).

## Platform capabilities and local approval

- **macOS idle sleep.** Use a process-scoped assertion, such as `caffeinate -i -w <PID>` invoked by the engine or the equivalent IOKit assertion. The idle assertion allows the display to sleep and does not cover lid closure. [Apple caffeinate source](https://github.com/apple-oss-distributions/PowerManagement/blob/main/caffeinate/caffeinate.c) · [Apple IOKit documentation](https://developer.apple.com/documentation/iokit/kiopmassertiontypepreventuseridlesystemsleep)
- **macOS closed lid.** Offer a separate opt-in within Keep awake. Validate a native mechanism for the no-monitor case on a physical Apple Silicon MacBook Air. List supported model/OS combinations based on hardware tests. An ordinary idle assertion or administrator approval by itself is insufficient evidence that the mechanism works. Power transitions need hardware verification. [Amphetamine Power Protect](https://github.com/x74353/Amphetamine-Power-Protect)
- **Windows.** Use a process-owned idle request such as `PowerRequestSystemRequired` through `PowerSetRequest`. Closing the lid is subject to Windows lid policy. [Microsoft power requests](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-powersetrequest)
- **Linux.** Use an idle inhibitor where the host's `systemd-logind` and desktop session honor it. Validate the supported environment before reporting protection. The host's lid handler determines what happens on closure. [systemd-inhibit](https://freedesktop.org/software/systemd/man/latest/systemd-inhibit.html) · [logind lid policy](https://www.freedesktop.org/software/systemd/man/latest/logind.conf.html)

Unsupported hosts show unavailable capabilities and the reason. Nothing enables protection automatically on a VPS, on a different host or during Promptbook installation. OS shutdown, explicit Sleep and thermal/low-battery protections retain authority.

If the validated macOS closed-lid mechanism requires a privileged helper, offer its setup only after the operator explicitly enables closed-lid operation. Explain what component needs local administrator approval, what it can change and why. Provide the same local approval path from CLI-only and desktop installations. The ordinary engine runs under its existing user identity. An authorized helper exposes only its power operations to verified local engine owners. Neither a remote client nor an agent can install or authorize it. If setup is declined, unavailable or revoked, show the resulting capability and continue with idle-only protection if available. The helper must release temporary OS changes when the last request ends, including after a crash or reboot. Any host-wide setting used by the mechanism requires explicit disclosure and reliable restoration without overwriting independent user changes.

## Restarts and updates

Restore the saved preference when the engine starts and evaluate the current power, capability and [restored lifecycle intent](persistence.md#restored-operator-intent) before acquiring a fresh request. On macOS and Windows, existing user-scoped automatic startup after sign-in is sufficient. A saved power preference cannot start an engine before sign-in or authorize work. A service restored paused after a deliberate Stop, manual Pause or ambiguous crash holds no protection until it actually runs. Explicit Restart uses its normal [replacement semantics](service-lifecycle.md#command-and-dashboard-parity).

For a managed [update](updates.md) or restart that preserves a running agenda, coordinate the handoff so there is no gap in protection that can put a closed-lid MacBook to sleep during replacement. A short-lived helper can carry an existing request through a bounded handoff without granting a second engine project ownership. Verify the replacement's identity and its effective protection before completing the handoff. Cancel or release it on a superseding pause/stop, failed or expired handoff, or loss of eligibility. If continuity cannot be ensured with the lid closed, defer automatic replacement and show the reason.

## Acceptance outcomes

- On a supported physical MacBook Air, opt in while connected to external power, with no external display. Close the lid and all client windows. Verify that an actual task continues, a scheduled task starts after an idle period and the engine remains reachable from a second device. Verify that the open-lid mode permits display sleep and session lock. Use a desktop installation and a standalone CLI installation.
- On the same MacBook, unplug while closed and verify the request is released. Reconnect and verify the saved policy is reapplied on a running host, including after wake. Deny or revoke any required helper approval and verify honest idle-only or unavailable status and ordinary engine operation.
- Start two eligible engines. Pause one, including a Health pause, then disable or stop the other. Confirm that the first releases at completed Pause, the second keeps the host awake while eligible, and neither holds a request after both release. Exercise Resume, start directly paused, timed expiry, ordinary Stop, force stop and abrupt process loss.
- Verify that clients agree on the saved mode, actual capability and the last work time. An idle project in the persistent mode stays protected on external power. Another user or a clone on another machine does not inherit the preference.
- Replace a running engine with the MacBook still closed and verify protection through a successful update and bounded cleanup after a failed or cancelled handoff. Reboot and sign in. Verify an eligible running engine reacquires protection and an engine restored paused does not. The timed deadline stays absolute through each transition.
- On supported Windows and Linux configurations, verify idle protection, release, and the distinction between idle sleep and OS lid policy. Verify that unsupported environments never report active protection.
