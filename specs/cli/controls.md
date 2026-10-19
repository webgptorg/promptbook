# Shared runtime controls

[Main specification](../_main.md) · [Service lifecycle](service-lifecycle.md)

There is one engine-owned control model for a project's running process. Project configuration and CLI options supply defaults/overrides; any number of attached terminal dashboards, an explicit foreground view, browser clients and independently usable [API](api.md) inspect and change that same state. An action in one interface is reflected in the others, not sent to a separate task runner. Equivalent information and applicable controls are required; layouts and gestures may differ. The engine continues with no attached clients.

Expose actual engine version, the four live [service states](service-lifecycle.md), pause/resume, cancellation of pending pause/stop, change of draining intent, graceful stop, explicit force stop and restart. These use exactly the operations behind `ptbk pause`, `ptbk resume`, `ptbk stop`, `ptbk stop --force`/`-F` and `ptbk restart`. Lifecycle actions live in a visible main dashboard panel, not only a hidden technical view. Distinguish an accepted request, work still draining, a completed action and a failed/unconfirmed outcome.

Also expose skipping a pacing/backoff wait, current agent/task and activity, ordered queue/task details, results/statistics, waits, errors, actionable/unread chat counts and effective routing. [Expandable details](dashboard-details.md) contain the effective harness/model/thinking level for the actual execution and the selected browser profile, launch health and repair diagnostics. Unavailable data is labelled, not guessed from defaults. A collapsed detail panel never hides a required action or changes runtime behavior.

Provide new-chat, all-chats, open-thread and append/reply actions through the same persisted chat model. New chat defaults to the [Chatter-first picker](chat-ui.md); opening an existing request retains its actual author. Browsing threads is read-only. Agent and harness/model inventories remain accessible; harness catalogs follow [featured/More presentation](harness-plugins.md), not an unbounded default dump.

Every configurable CLI behavior is discoverable and adjustable through runtime controls where meaningful, including enabled harnesses, routing preferences, pacing, browser mode/profile, harness-update policy and persistence settings. Browser diagnostic/recheck, retry-start and restart actions use [shared browser ownership and recovery](browser.md), never client-local process manipulation. Show whether a change is active, awaiting a safe boundary or requires restart. Placement transitions may require restart; HTTP enablement and port may remain startup-only exceptions.

Live changes are temporary unless the user explicitly saves project defaults under [configuration precedence](configuration.md). Preserve active-task consistency and distinguish current-task from future-task settings. Pause prevents new claims but lets current work settle; it does not require harness suspension. Skipping a wait does not bypass eligibility, conditions, setup or authorization. Do not duplicate work, override an explicit pause through chat or switch paid accounts without authorization.

Leaving an attached terminal/browser dashboard is not a stop command. The state machine owns cancellation, stop-to-pause confirmation, controlled shutdown and intentional-stop persistence. Force stop is explicitly selected, not a second ambiguous press of Stop. Only the owning service cleans up its [project lock](locking.md) when possible; an external hard kill has no cleanup guarantee.

Every independently accepted human-facing chat message is a scoped commit by default; task-internal agent messages join their task result. Opening/reading a chat does not commit or resolve a pending question. Inspection and runtime-only controls create no commits. All mutations obey the same ownership, authorization and recovery rules on every channel.

See [channels](channels.md), [dashboard](dashboard.md), [terminal](terminal.md), [global overview](global-dashboard.md), [chats](chats.md) and [browser](browser.md).
