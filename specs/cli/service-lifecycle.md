# Service states and lifecycle controls

[Main specification](../_main.md) · [Process modes](process-modes.md) · [Shared controls](controls.md) · [Project locking](locking.md)

The engine owns scheduling, state transitions and shutdown. CLI commands, terminal dashboards, the browser app and direct API clients invoke the same operations, not parallel implementations. A dashboard is an independent client; leaving it is not a lifecycle request.

## Four live states

| State | Meaning |
| --- | --- |
| `running` | New eligible tasks may start. The engine may be executing work or legitimately idle. |
| `pausing` | No new background task starts. The current task drains; after it settles, remain alive in `pause`. Chat remains usable. |
| `pause` | No queued background task executes. Chat, required chat routing/consultations, authoring, inspection and controls remain available. |
| `stopping` | No new work starts. Drain/checkpoint owned task and conversation work, then clean up and exit. |

These are service states, not task phases or client-local flags. `stopped` is not a fifth live state: after exit there is no running service. A client may display that observed outcome or a disconnected diagnostic. Force stop is an immediate action, not another state; a separate hard/soft pause mode is not introduced now. The current pause suspends automatic new background work, not conversation. Reasons such as an empty queue, backoff or a blocked prerequisite remain separate from the service state.

Draining does not suspend or restart the harness. Let the current task finish its ordinary bounded execution, checks and result persistence, or safely checkpoint an interrupted, failed or human-waiting phase under [recovery](recovery.md). A human reply is not required merely to complete shutdown when ownership can safely be released. During pausing/pause, do not start queued background follow-ups, task-assignment Router work, Teacher, Fixer or discovery tasks. Conversation and everything necessary to serve it, including first-message routing and TEAM consultation, remain available even while another background task drains. Tasks authored in chat are saved but do not execute until scheduling resumes. This exception does not permit running queued work under a chat label; stopping still drains toward shutdown. Do not silently escalate a slow graceful operation to force stop.

## Transitions and cancellation

- Pause from `running` enters `pausing` while a task is active, otherwise `pause` immediately. Once draining settles, `pausing` becomes `pause`.
- Ordinary stop from any live state enters `stopping` while work must drain; when there is no active work, perform orderly cleanup and exit immediately. Stopping an already paused service does not wait for a nonexistent task.
- Resume from `pause`, or cancellation of pending `pausing` or `stopping`, returns to `running`. It does not interrupt, replay or duplicate the active task. Cancelling a pending restart also cancels its planned replacement start.
- Changing `pausing` to `stopping`, or `stopping` to `pausing`, only changes what happens after the same current task settles. It does not stop and relaunch that task. If nothing remains active, apply the destination immediately.

Before replacing an already requested stop/restart with a pause, explicitly confirm that shutdown is being cancelled in favour of pause. In noninteractive use, report the conflict without an invisible prompt; the caller can explicitly cancel through resume and then request pause. Repeating the same pending request is idempotent, not implicit escalation. A stale confirmation cannot overwrite a newer user's decision unnoticed.

The engine serializes control decisions with task claims: after pause/stop is accepted, no next background task slips through that boundary. Chat handling under pause follows the explicit conversation exception above. Cancellation is available while a request is pending, not after irreversible shutdown has begun. Report an already completed/too-late request honestly. State and pending intent changes propagate to every attached client.

## Command and dashboard parity

| Entry point | Shared operation |
| --- | --- |
| `ptbk pause` | Request graceful pause. |
| `ptbk resume` | Resume paused scheduling or cancel a pending pause/stop/restart and return to `running`. |
| `ptbk stop` | Request graceful shutdown after current work settles. |
| `ptbk stop --force`, `ptbk stop -F` | Stop owned work immediately, without waiting for task completion, then exit with best-effort owned cleanup. |
| `ptbk restart` | Gracefully stop the selected service, then start exactly one replacement for the same project and effective configuration. |

The main dashboard service-control panel exposes these same operations, including cancellation, changing a pending intent and an explicitly labelled force-stop action. Stop and restart are not substitutes for closing a client. A second press of Stop must not silently mean force stop. Inspection and controls remain usable during `pausing`, `pause` and `stopping`.

Restart uses the ordinary stop/start lifecycle. Its drain phase is `stopping`, with visible restart intent rather than another runtime state. Do not start the replacement until the old owner has finished and released ownership. Restart from `pause` needs only immediate orderly shutdown before starting the replacement in `running`. Failure to start the replacement is reported as such, not as a successful running service. Restart preserves effective project configuration and the selected installation, and does not install an engine update implicitly.

One-shot commands distinguish request accepted/pending, cancellation and completed outcomes; acknowledging `stopping` is not proof that the service has exited. Confirm completed stop only after the selected owner has ended, not merely because its control endpoint disconnected. Reconcile an uncertain reply without blindly replaying mutations against a replacement service. Runtime-only controls create no Git commits.

## Force stop, signals and cleanup

An internal force request stops the active owned execution without a graceful task-completion wait. Preserve whatever interruption evidence is available, never mark unfinished work done, and make a bounded best-effort cleanup through the owning service, including its own lock. Force stop while already in `pause` has no background task to drain, but still terminates any owned in-flight conversation work according to the force-stop contract before cleanup. A paused chat is not a separate engine or an exemption from explicit shutdown.

A catchable graceful termination request delivered to the engine by the operating system follows graceful stopping where the host permits it. A signal delivered only to an attached dashboard closes that client; it is not forwarded as an engine stop request. An externally imposed uncatchable kill may prevent all cleanup, leaving lock records behind. This is the deliberate difference between internal force stop and an external hard kill; there is no promised cleanup or new next-start lock-removal requirement for that case. The owner-cleanup rules are in [locking](locking.md).

An intentional completed stop, including internal force stop, follows [intentional-stop persistence](persistence.md); restart is not a permanent stop. Cancelling a pending stop must not leave an intentional-stop setting that later suppresses ordinary crash/reboot recovery. External termination may be subject to existing host recovery policy; do not describe it as a guaranteed permanent user stop.

## Acceptance outcomes

Exercise all four states through commands, two terminal clients, browser and API. Pause/stop an active task and verify it drains exactly once with no next claim. Cancel both pending states and switch their intent without restarting the task; confirm stop-to-pause replacement and reject stale conflicting requests. Pause an idle engine immediately, then resume, stop or restart it. Force stop has no waiting state and paused force stop still performs orderly cleanup. Verify internal forced cleanup, graceful OS termination, external hard kill without a cleanup guarantee, lost replies and replacement-owner protection. Closing any observing client never invokes these operations.
