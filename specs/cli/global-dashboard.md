# Global dashboard and host-wide service discovery

[Main specification](../_main.md) · [Project dashboard](terminal.md) · [Project locking](locking.md)

`ptbk dashboard --global` is a separate, continuously refreshed service overview for the local operating system, resembling a live process table rather than the dashboard of one project. It works from any current working directory, including outside Git and outside a Promptbook project. It neither selects nor initializes that directory. A conflicting explicit project selector such as `--path` is diagnosed rather than silently limiting a supposedly global view.

There is no global project engine. Every discovered engine belongs to one concrete project directory and owns that project's runtime state. The global dashboard is a lightweight monitoring/navigation client; its lifetime is independent of every service it observes.

## Discovery contract

Every running Promptbook engine registers in a host-local discovery mechanism independently of whether a dashboard is open. Discovery must span global installations, project-local installations, distinct package versions and launch locations; matching only the currently invoked binary, its installation directory or a single project's `.ptbk/` is insufficient. Include foreground owners as well as background services, identifying their mode accurately. The common registration/control discovery contract must remain interoperable across supported engine versions.

Keep discovery metadata outside any one project, with appropriate operating-system access controls. It identifies the actual project path, process instance, loaded engine version, mode and a way to verify/connect to that owner. It is not a second authoritative task store, a credential catalogue or a global execution queue. Do not expose tokens, browser sessions, pairing capabilities or project content beyond the viewer's permissions.

List all discoverable running engines across the host, not just projects previously opened by this client. Respect other OS users' access boundaries; inaccessible coverage is stated rather than labelled as a complete empty system. Do not grant cross-user control or bypass authentication merely because an entry exists. A local dashboard must not depend on an internet relay or enabled browser HTTP server to discover the local services.

Verify registration and process identity before presenting an entry as live or connecting. Distinguish unknown/unreachable state from an observed `pause` or a stopped process. Reconcile expired registrations and PID reuse without killing processes, deleting project locks, changing their configuration or scanning unrelated project contents. Removing a proven dead discovery entry is not project lock cleanup.

## Live table and navigation

Use a readable, bounded, keyboard-navigable table with project name and unambiguous path, actual engine version, process identity/PID, process mode and live service state (`running`, `pausing`, `pause`, `stopping`). Include a concise current-work/wait summary when available, keeping long details inspectable without destroying the table layout. A pending restart is labelled without inventing a fifth state. Display freshness and unavailable data honestly; do not substitute the viewer's version for a service's version.

The table updates while open: new starts appear, state changes propagate and ended services disappear or are briefly labelled as ended rather than retained as live. Preserve the selected service and focus during updates; do not accidentally select a different row when the old service exits. Narrow terminals, long paths and resize remain usable. `--raw` is also continuous, with plain state/events and no hidden prompts or cursor art.

With zero running engines, show an explicit zero/empty state and keep monitoring. This is a successful usable dashboard, not a project-not-running error. A later start appears without reopening the view. Distinguish that case from a failed or permission-limited discovery mechanism.

Opening the selected row attaches to that service's ordinary [project dashboard](terminal.md) without changing the user's working directory, starting a service or acquiring its lock. Resolve the target from verified discovery information, not the launch directory. Allow returning to the global overview without stopping the selected engine. If a service disappears or is incompatible/unreachable, explain that outcome and any actionable connection instruction instead of attaching to an unrelated replacement. Leaving with Q/Ctrl+C closes the viewer only.

Service controls are available after attaching to a project's dashboard and use its shared lifecycle operations. The global overview does not need another implementation of those controls or a new global stop-all command. A standalone per-project dashboard still fails actionably when its selected service does not exist; the global empty-state behavior must not change that contract.

## Acceptance outcomes

Open the global dashboard in an arbitrary non-project directory with no services: it stays open and shows zero. Start two projects through different installations/versions and observe both; change their states, stop one and start another while the table remains open. Attach to each without `cd`, retain the correct project's engine/version and return to the table. Open several viewers, then close them all: services survive. Verify foreground ownership, disabled HTTP, offline use, spaces/path aliases, stale registrations, reused PIDs, permissions, incompatible entries and disappearance during selection. No duplicate engine, global engine, fabricated live row or project-lock cleanup is caused by observation.
