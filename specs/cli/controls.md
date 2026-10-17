# Shared runtime controls

[Main specification](../_main.md)

There is one control model for a project's running process. Project configuration and CLI options supply defaults/overrides; the attached terminal dashboard, foreground dashboard, browser SPA and independently usable [service API](api.md) inspect and change the same state. An action in one interface is reflected in the others, not sent to a separate task runner. Equivalent information and applicable controls are required, not merely similar-looking status screens; layouts and input gestures may differ.

Expose the actual running engine version, pause/resume, skipping a pacing/backoff wait, graceful termination, current agent/task/harness and activity, ordered queue/task details, results/statistics, waits, errors, actionable/unread chat counts and effective routing. Provide new-chat, all-chats, open-thread and append/reply actions in every interactive client through the same persisted chat model; browsing threads is read-only. Agent and harness/model inventories remain accessible on request; catalog views follow [featured/More presentation](harness-plugins.md), not an unbounded default dump.

Every configurable CLI behavior is discoverable and adjustable through runtime controls where meaningful, including enabled harnesses, routing preferences, pacing, browser mode/profile, harness-update policy and persistence settings. Show whether a change is active, awaiting a safe boundary or requires restart. Process-mode transitions may require restart; HTTP enablement and port may remain startup-only exceptions.

Live changes are temporary unless the user explicitly saves project defaults, following [configuration precedence](configuration.md). Preserve active-task consistency. Pause prevents further task starts and visibly indicates a pending pause when work cannot stop immediately. Skipping a wait does not bypass eligibility, task conditions or authorization. Do not duplicate work, bypass task constraints or apply an unannounced paid-account switch. Distinguish current-task from future-task settings.

Leaving an attached terminal or browser dashboard is not a stop command. Explicit graceful stop follows lifecycle and recovery rules and, for a daemon, intentional-stop persistence behavior. Show control outcomes and disconnected/stopped states rather than implying that a requested action has already succeeded.

Every independently accepted user-facing chat message is a scoped commit by default; agent↔agent task-internal messages join their task result. Opening/reading a chat does not commit or resolve a pending question. See [chats](chats.md) and [chat UI](chat-ui.md).

Inspection is read-only. Mutations obey the same ownership, authorization and recovery rules on every channel. See [channels](channels.md), [dashboard](dashboard.md), [terminal](terminal.md) and [browser](browser.md).
