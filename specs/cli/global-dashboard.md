# Global dashboard and host-wide project registry

[Main specification](../_main.md) · [Project dashboard](terminal.md) · [Project locking](locking.md) · [Emergency stop](panic.md)

`ptbk dashboard --global` is a continuously refreshed overview of known projects and their engines on the local operating system. It works from any CWD, including outside Git and outside a Promptbook project, without selecting or initializing that directory. Diagnose conflicting project selectors such as `--path` rather than silently narrowing global scope.

There is no global engine. Every engine owns one concrete project directory. The global dashboard is an independent discovery/navigation/control client, not another scheduler. Its terminal tab title follows [terminal-title](terminal-title.md): `PTBK <animated default agent visual> Global`.

## Durable registry and live discovery

Maintain a host-local registry outside individual projects. Successful initialization/start registers the project; live discovery also includes engines launched by other clients, foreground/background modes, global/project-local installations and supported package versions. Do not limit discovery to this client's history or installation, and do not scan unrelated directories to invent projects.

A known project remains registered after graceful stop, force stop, [panic](panic.md), process exit and OS reboot. Reconcile transient process records without deleting its durable entry. Equivalent paths/installations identify one project; successive engine instances remain distinct. Explicit registry removal is how the operator forgets it.

Private metadata identifies the canonical project path, selected installation and enough non-secret launch context to use ordinary start again. Live records include verified owner identity, actual loaded version/mode and local control discovery. Label last-run data historical when no owner exists; never show an old PID, endpoint or version as live. The registry is not a task store, credential catalogue or global execution queue. Preserve project configuration, recovery evidence and [startup intent](persistence.md).

Respect OS-user permissions and authentication; state inaccessible coverage honestly. Registration grants no cross-user authority and exposes no tokens or unauthorized content. Local discovery/control works offline and without HTTP or an internet relay. The common discovery/control contract remains interoperable across supported engine versions.

Verify process identity before presenting live state or controlling an owner. Distinguish verified `stopped` from unknown/unreachable and from the four live states. Stale records, PID reuse or connection loss cannot authorize control of an unrelated process. Registry reconciliation/removal never substitutes for [project lock cleanup](locking.md).

## Table and navigation

Show a bounded keyboard-navigable table of known projects, including stopped ones: name/unambiguous path, verified current state, actual live version/process/mode, freshness and concise work/wait summary when available. Stopped entries explicitly say `stopped`, without a live PID or ready endpoint; last-run information remains inspectable. Stopped is observed absence, not a fifth live state. Pending restart is labelled intent.

New registrations appear, state changes propagate and ended engines become stopped rows rather than disappearing. Preserve project selection/focus across exits, starts and resize. Narrow terminals/long paths remain usable. `--raw` continuously emits plain state/events with no hidden prompts or cursor art.

With no known projects, show an empty state and keep monitoring. With known projects but zero active engines, keep stopped rows and truthful counts. Distinguish both from failed or permission-limited discovery.

Opening a live row attaches to its [project dashboard](terminal.md) without `cd`, lifecycle changes or lock acquisition; returning leaves it untouched. A stopped row offers explicit Start through the shared launcher, not implicit startup from inspection/selection. Diagnose missing paths/installations and incompatible/unreachable owners rather than substituting another target. Q/Ctrl+C closes only the viewer.

## Individual and bulk controls

Provide discoverable individual controls and bulk actions over all applicable known projects. Invoke shared project/domain operations, not duplicated UI lifecycle/persistence logic.

| Bulk action | Shared behavior |
| --- | --- |
| Start all | Start verified stopped projects using recorded project/installation context; leave live engines unchanged. Start is not Resume. |
| Stop all | Gracefully stop applicable live engines, including paused ones; distinguish draining from completion. |
| Force stop all | Immediately stop applicable live engines and all their owned execution processes, as with `ptbk panic`. |
| Pause all | Add manual pause to applicable live engines and drain active background work. Preserve Health reasons and conflicting-intent confirmation rules. |
| Resume all | Remove/cancel applicable manual pause intent; independent Health reasons may still block scheduling. Never start stopped projects. |
| Remove all stopped | Forget only verified stopped entries under the removal contract below. |

Apply shared idempotency, verification and stale-intent rules per target. Pause/Resume/Stop do not start a stopped project. Start does not replace a live owner. Bulk actions keep the global overview open rather than opening a viewer for every project.

Show per-project accepted/pending/completed/failed/unconfirmed outcomes and an overall summary. Continue independent targets after another fails, without claiming complete success. Revalidate ownership/state when applying actions; never blindly replay against a replacement. `ptbk panic` is the directory-independent emergency force-stop shortcut with its own confirmation contract. No global execution queue/engine is introduced.

## Removing projects from the registry

Removal forgets only the host-level entry and obsolete launch/discovery metadata. Preserve the directory, Git history, configuration, Books, browser sessions and recovery/evidence files. Inspection or removal never authorizes project-data deletion.

Only a verified stopped project may be removed. Running, pausing, paused and stopping engines must first complete ordinary or forced stop; unknown/unreachable is not proof of eligibility. Explain the required stop rather than silently performing it during removal.

Provide individual removal and bulk Remove all stopped. In a mixed list, bulk removal leaves live/uncertain entries present. Recheck eligibility immediately before removal, including concurrent starts; never erase a live registration. A later explicit init/start registers the preserved project again.

## Acceptance outcomes

Open outside Git with no projects: the view stays open. Initialize/start projects through different installations, versions and modes, including no-HTTP/offline use; each accessible project appears once. Stop/force-stop one and reboot: its stopped row remains without fabricated live data. Distinguish unknown owners, stale records, PID reuse and permission-limited coverage.

Individually and in bulk start, pause, resume, stop and force stop mixed live/paused/stopped projects. Verify pause composition, no duplicate owners, no implicit starts/resumes, stable selection, partial failures and no viewer fan-out. Attach/return/close without lifecycle effects.

Remove one stopped entry and all stopped entries from a mixed list. Live/uncertain entries cannot be removed, including during concurrent start. Project files/history/sessions/recovery survive; explicit start registers it again. Exercise missing paths/installations, long paths/resize/raw and zero-active versus zero-known counts. Observation/removal never deletes project locks.
