# Promptbook sub-engines

[Main specification](../_main.md) · [Process modes](process-modes.md) · [Shared controls](controls.md)

A **Promptbook Engine** is the owner of one project. Internally it is composed of long-lived **sub-engines** that own coherent runtime domains. "Sub-engine" is architectural vocabulary for a part of the project engine; it is not another Promptbook process, daemon, project lock, scheduler or independently started service.

A dashboard page is a view/controller over a sub-engine or another engine domain. Business logic must live in the engine/sub-engine and remain available when no dashboard is open.

## Ownership and lifetime

Every project engine creates and owns its own sub-engines. Do not silently promote a sub-engine into a host-global singleton merely because several project engines run on the same machine. Two Promptbook engines on one computer may therefore observe the same host independently.

A sub-engine follows the lifetime of its owning Promptbook Engine unless its own specification explicitly permits a narrower resource lifetime. It must not acquire the project's primary ownership lock separately or create another background agenda.

Sub-engines communicate through explicit engine state/operations rather than UI state. A terminal/browser/API client can inspect or control the same sub-engine operations without duplicating their implementation.

## Current domains

The architecture uses this vocabulary for runtime domains such as:

- the **Health sub-engine**, exactly one per Promptbook Engine, continuously observing host health and owning health incidents/actions;
- browser sub-engine behavior, which can manage zero or many named browser tool instances;
- harness sub-engine behavior, which can manage zero or many named harness instances and their execution/readiness;
- the **[Wallet sub-engine](wallet.md)**, one per project engine, managing encrypted project login credentials and protected pending login actions.

This list is extensible. A sub-engine may manage one singleton domain or a collection of configured instances; "sub-engine" does not imply one external process per item.

The [Health sub-engine](health-sub-engine.md) is the first domain whose singleton/per-engine behavior and pause interaction are specified explicitly here. Browser/harness specifications define their concrete resources. A [profile connection pool](browser.md) can share an external browser process across engines without turning their project-owned sub-engines into a host-global Promptbook engine. Wallet keeps project-local encrypted persistent data under [project encryption](project-encryption.md).

## UI boundary

The dashboard home screen may have one tile per important sub-engine/domain and pages for deeper inspection. The page reads state and invokes sub-engine operations; it does not implement polling, health thresholds, browser recovery, provider selection or other engine logic itself.

Closing every viewer never stops a sub-engine. Conversely, a sub-engine can raise attention, update state or auto-resolve an incident while no viewer is attached; the next viewer observes the resulting state.

## Acceptance outcomes

Run several Promptbook engines on one host. Each has its own Health sub-engine and independent project state without a machine-wide Promptbook singleton or synchronization requirement. Attach several clients to one engine: they observe one shared sub-engine state. Close all clients: monitoring/resource logic continues. UI-only code never becomes required for the underlying domain behavior.
