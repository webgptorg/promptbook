# macOS sleep prevention: deferred research

[Main specification](../_main.md) · [Unattended operation](autonomous-operation.md) · [Notifications](notifications.md) · [Service lifecycle](service-lifecycle.md)

**Status: researched direction, not an implementation requirement for the notification work.** This note records the requested macOS investigation. No new switch, power-setting mutation, helper installation or promise of operation with a closed lid is introduced now. Windows/Linux sleep prevention is outside this investigation.

## Verified mechanisms and limits

Apple provides process-owned power assertions. Its published [caffeinate source](https://github.com/apple-oss-distributions/PowerManagement/blob/main/caffeinate/caffeinate.c) maps `-i` to preventing user-idle system sleep, separately from display sleep. It supports a command's lifetime or `-w <PID>` process monitoring. This makes preventing idle sleep while allowing the screen to turn off a plausible building block, subject to verification on supported macOS versions.

Apple's archived [QA1340](https://developer.apple.com/library/archive/qa/qa1340/_index.html) distinguishes idle sleep from forced sleep: lid closure, explicit Sleep and thermal/low-battery conditions are not covered by an ordinary idle-sleep assertion. Do not interpret `caffeinate` as a universal lid-closure override or wake mechanism.

The Amphetamine author's [Power Protect repository](https://github.com/x74353/Amphetamine-Power-Protect) describes Apple Silicon closed-display issues after external-power changes. Its workaround installs a script/configuration with administrator authentication. This is evidence of a separate, hardware/OS-dependent problem, not a drop-in unprivileged guarantee Promptbook already has.

These primary sources were checked on **2026-11-02**. The Apple QA is archived guidance; current hardware/OS behavior still requires direct testing. The following ownership/design direction is a proposal inferred from those mechanisms, not a claim of completed validation.

## Candidate engine-owned direction

If selected later, idle-sleep prevention belongs to the **engine**, independently of dashboard sound/notification preferences. Closing every viewer must not remove an engine-owned assertion that authorized unattended work still needs. Prefer a scoped process-lifetime assertion/helper over silently changing persistent system-wide power settings. Release it on the appropriate engine lifecycle transition and recover without leaving an orphan inhibitor after crashes, updates or restart.

Decide the activation policy separately: whole engine lifetime versus useful active work, behavior while paused/waiting/idle, battery versus external power, explicit opt-in/default and interaction between several engines. Those are deferred power-feature decisions and do not block the agreed notification specification. Do not overload the temporary Sounds & notifications control.

Closed-lid operation needs a separate feasibility decision and hardware/power-source matrix; do not silently install Amphetamine/Power Protect, require administrator access or bypass thermal/low-battery protection as part of notifications. Battery consumption, heat/ventilation in a bag, power changes, helper cleanup and truthful user-visible inhibition state need review before that feature can be promised.

## Future verification, if authorized

On supported Apple Silicon and any claimed Intel/macOS combinations, distinguish idle sleep, display sleep, manual Sleep, lid closure and low-battery/thermal handling. Exercise battery/charger transitions, crash/kill/reboot/update, multiple engines and zero dashboards. Verify assertion ownership/release and that starting/stopping an unrelated viewer never changes the policy. Do not claim agents or notification delivery continue while the host is actually asleep.
