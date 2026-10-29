# Health sub-engine

[Main specification](../_main.md) · [Sub-engines](sub-engines.md) · [Service lifecycle](service-lifecycle.md) · [Dashboard pages](dashboard-details.md)

Every Promptbook Engine owns exactly one **Health sub-engine**. It continuously observes the host resources relevant to that engine, creates/resolves health incidents, contributes health pause reasons when required, and exposes safe remediation operations. It works whether or not any dashboard is open.

If ten project engines run on one machine, ten Health sub-engines may independently read the same operating-system resource state. Do not add a machine-global singleton or cross-engine synchronization protocol for this purpose.

## Observed host health

At minimum observe and expose:

- free disk capacity on the filesystem(s) used by the selected project/runtime;
- currently available physical RAM;
- configured/usable swap and its current availability;
- **available memory for new Promptbook work**, defined as usable available RAM plus usable available swap;
- CPU/load pressure in a platform-appropriate form;
- basic network/Internet reachability relevant to external work.

Report RAM and swap separately even though the memory limit uses their combined available capacity. Unknown/unsupported measurements are explicit rather than fabricated.

Disk and memory are the initial resource checks with configurable preventive thresholds. CPU and connectivity are still first-class health observations and can create warnings/attention when unhealthy, but do not invent automatic pause thresholds that are not specified here. Provider/tool-specific connectivity failures remain owned by their domains where applicable.

## Configured preventive limits

The project configuration contains the soft preventive thresholds [`limit.disk` and `limit.memory`](configuration.md), expressed in MiB. Engine defaults are:

- `limit.disk = 500`
- `limit.memory = 512`

A value of zero is permitted and effectively disables that preventive threshold; it does **not** disable detection of actual resource exhaustion.

When available disk or available memory falls below its configured limit, Health creates a **soft health incident** and corresponding soft health pause reason. This is a conservative boundary intended to stop claiming new background work before the operating system reaches failure.

Avoid flapping near a threshold. A low-resource incident remains the same incident until the resource has clearly recovered above the configured threshold using a small bounded hysteresis/debounce policy. The exact recovery margin/sampling strategy is an implementation choice; it must not repeatedly create a fresh pause on every poll.

## Soft and hard health incidents

A **soft health pause** is preventive. The operator may explicitly override/dismiss that pause for the **current incident** after a clear warning that Promptbook is continuing below the recommended configured limit. The override does not change `ptbk.json`.

An incident override is not time-based. While the same below-limit condition continues, repeated polling must not immediately recreate the dismissed soft pause. Once the resource genuinely recovers and that incident closes, a later new drop is a new incident and can pause again.

A **hard health pause** represents actual inability to proceed safely, not another configured threshold. Examples are effectively no writable free disk capacity or no usable available RAM/swap capacity. There is no `hardLimit` setting and no configurable numeric "hard threshold". A hard health pause cannot be manually overridden; it clears only when the underlying hard condition is no longer true.

Soft/hard are properties of health incidents/pause reasons, not separate lifecycle states. The engine still exposes the common `running`, `pausing`, `pause` and `stopping` states.

## Pause interaction

Health adds/removes its own pause reasons under the [composable pause model](service-lifecycle.md). It never erases a manual pause reason. After OS startup, re-evaluate current conditions before background claims; unexpected process loss instead follows conservative paused restoration and Health cannot erase that manual reason; historical Health-only pause is not permanent manual intent. Health may clear its recovered condition while separately restored manual pause remains. See [startup persistence](persistence.md).

When a health reason becomes active while background work is running, no new background task is claimed and current work drains under ordinary graceful-pause semantics. When the health condition resolves, Health removes its reason automatically. Scheduling resumes only if **no other pause reason** remains.

The Health page does not offer generic manual **Pause all / Resume** controls. Those belong to the System page. Health may only show/operate its own incidents, including allowed soft-incident override.

## Health page and home tile

The dashboard home screen has a compact Health tile. Healthy state is deliberately terse (for example, `System OK`/healthy summary). An incident replaces that with the most useful bounded problem summary, such as low free disk, low available memory or failed connectivity, and marks the tile through the shared attention system.

Entering the Health page shows the full observed values, measurement freshness, affected filesystem/path, configured limits, RAM/swap breakdown, incident severity/reason, resulting scheduling impact and recommended next actions. Multiple health incidents may coexist.

The Health page is only UI over the Health sub-engine. Polling, incident identity, pause creation/removal and remediation operations work without the page.

## Remediation operations

Health may offer actions that are useful even before an incident exists:

- clean **Promptbook-owned cache for this project/engine** with a preview/confirmation appropriate to destructive cleanup; never present arbitrary user files or unrelated system caches as safe Promptbook cleanup;
- on supported Linux systems, inspect and offer creation/adjustment of swap when memory pressure makes it useful.

Swap operations are primarily for Linux/VPS environments. They require explicit operator approval, report the planned size/path and privilege requirement, and must fail actionably rather than hiding a sudo/password prompt inside an unattended engine. Unsupported platforms show guidance instead of pretending the action exists.

These operations belong to the Health sub-engine and are exposed consistently to applicable clients. The dashboard page does not shell out independently.

Cache cleanup must preserve persistent `.ptbk/wallet/` and `.ptbk/encryption/` data, host-binding references, browser sessions and recovery records. Ignored does not mean disposable.

## Acceptance outcomes

Run one engine with healthy resources: the home tile stays compact while the Health page shows disk, RAM, swap, available memory, CPU and connectivity. Lower disk below 500 MiB with defaults: a soft health pause appears and no new background task starts. Override it: the current incident stays acknowledged without being recreated on the next poll; recovery closes it and a later new drop creates a fresh incident.

Create simultaneous manual and health pause reasons. Clearing either one alone does not resume while the other remains. A soft health condition may be overridden; actual disk/memory exhaustion creates a non-overridable hard health pause. No configurable hard limit exists.

Run multiple project engines on the same host and verify independent Health sub-engines without a global coordinator. Exercise project-cache cleanup and Linux swap actions from the page and through the shared domain operation; monitoring and auto-resolution continue with no dashboard attached.
