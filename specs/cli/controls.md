# Shared runtime and saved-management controls

[Main specification](../_main.md) · [Service lifecycle](service-lifecycle.md) · [Shared domain logic](../coding-standards/shared-logic.md)

One engine-owned control model serves any number of terminal dashboards, foreground views, browser clients and independent [API](api.md) clients. They inspect and operate the same project; none starts a second scheduler. The engine continues with zero clients. Information and applicable operations are equivalent even where layouts/gestures differ.

## Lifecycle, work and conversation

Expose actual engine version, four live service states, composable pause reasons, manual pause/resume, cancellation/replacement of pending pause/stop, graceful stop, explicit force stop and restart. These are precisely the shared operations behind `ptbk pause`, `ptbk resume`, `ptbk stop`, `ptbk stop --force`/`-F` and `ptbk restart`. The home screen keeps lifecycle state obvious; the System page owns full lifecycle controls/reasons, distinguishing accepted/draining/completed/failed/unconfirmed outcomes.

Also expose real pacing/backoff wait skipping, current agent/task, ordered queue, outcomes, waits, errors, actionable/unread chat counts and effective routing. Missing tools mean running with a resource wait, not technical pause or stop. Skip wait cannot bypass readiness, authority or task conditions. Any active pause reason prevents new background claims and is not erased by unrelated repair/tool changes. Manual and Health reasons compose under [service lifecycle](service-lifecycle.md). Pause still permits chat and all work necessary to serve it, including first-message Router selection; tasks authored there remain pending. Stopping retains its shutdown boundary.

New/open/list/append/reply chat operations use the same durable chat model. New human chat uses the [Chatter-first picker](chat-ui.md); an existing request retains its author. Read-only browsing creates no message/commit. Every accepted human-facing message commits independently; task-internal exchanges join their result and conversation-only consultations use ordinary scoped persistence. Fixer questions use ordinary agent/TEAM communication, not another control channel.

## System and Health controls

The **System page** is the operator's lifecycle/engine page. It shows concise engine/process/project technical metadata that does not belong on the home screen (including actual engine version and project/runtime location), current lifecycle/pending intent, and every active pause reason. It provides generic manual Pause/Resume plus stop/restart/force controls through the shared operations.

The **Health page** is the UI/controller for the per-engine [Health sub-engine](health-sub-engine.md). It shows resource measurements, configured `limit.disk`/`limit.memory`, incidents, health pause reasons and allowed remediation/soft-incident override. It does **not** duplicate generic manual Pause/Resume. Health monitoring and pause creation/removal occur in the sub-engine with zero clients.

Viewer attention/focus remains presentation-only. Dismissing the transient blink of a Health/System warning does not resolve the underlying pause reason or incident.

## Tools, settings and diagnostics

[Tool management](tool-management.md) provides list/show/add/modify/reorder/enable/disable/remove through the same operations and types as CLI and init. **These are saved configuration operations**, committed immediately and reflected in every client. They are not temporary controls needing a second Save action. Show canonical records and actual readiness/use state; do not leak secret values or present supported-but-unconfigured integrations as enabled resources. Catalogs retain featured/More navigation, while configured inventories distinguish every named instance.

Use the shared in-use protections and separate last-enabled-type confirmation. Saving with the in-use acknowledgement lets previously acquired work finish; it is not a kill. The emergency alternative is the existing whole-engine force stop, followed by a separate tool operation. No tool-local force-stop flag/endpoint is introduced. Disable retains credentials/configuration; permanent removal follows conservative environment-reference handling.

Generic invocation/runtime settings remain temporary unless explicitly saved under [configuration precedence](configuration.md). Preserve actual-task context and show active, retained-current-use, pending-safe-boundary and restart-required states accurately. Placement/HTTP port can be genuine startup-only exceptions; tool inventory and `.env` changes must be detected live. Newly added tools can be used by the current task at a subsequent selection, not only after restart or task completion.

Per-tool browser recheck, startup retry and restart use the same engine-owned [browser recovery](browser.md) as automatic diagnosis. They respect profile/session/ownership safety and do not delete a tool, kill unrelated browsers or restart the engine. Runtime-only diagnostics/recovery creates no commit. [Expandable details](dashboard-details.md) expose actual execution metadata and individual profile/health state without hiding main actionable failures.

## Synchronization controls

When effective autosync is enabled, expose its compact dashboard status, redacted details and **Synchronize now** through the existing drill-down pattern. The action requests one shared [coordinator](git-synchronization.md) cycle, serialized/coalesced with timer and operation-boundary attempts. It does not run a second scheduler or bypass dirty-work safety. Report queued/running/deferred/failure/success distinctly; a fetch alone is not successful integration.

With autosync off, omit its dedicated dashboard panel/manual-cycle action. General settings can still show the disabled choice. Failed remote synchronization is distinct from local work and never implicitly pauses/stops the engine. All configuration, environment and Git mutations obey shared ownership/revision checks; a tool commit during task execution must remain scoped.

Leaving a dashboard/chat is not a service stop. Force stop is explicit, never an ambiguous second Stop press. Only the owner performs its [lock cleanup](locking.md) when possible; external hard kill has no cleanup guarantee. Inspection/navigation and runtime-only actions create no commits, and no saved operation is reported complete before required persistence succeeds.

See [channels](channels.md), [dashboard](dashboard.md), [terminal](terminal.md), [status](status-view.md), [global overview](global-dashboard.md) and [Git persistence](git-persistence.md).
