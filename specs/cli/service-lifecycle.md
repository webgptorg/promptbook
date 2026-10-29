# Service states and lifecycle controls

[Main specification](../_main.md) · [Process modes](process-modes.md) · [Shared controls](controls.md) · [Project locking](locking.md)

The engine owns scheduling, state transitions and shutdown. CLI commands, terminal dashboards, the browser app and direct API clients invoke the same operations, not parallel implementations. A dashboard is an independent client; leaving it is not a lifecycle request.

## Four live states

| State | Meaning |
| --- | --- |
| `running` | New eligible tasks may start. The engine may be executing work or legitimately idle. |
| `pausing` | No new background task starts. All active background tasks drain; after they settle, remain alive in `pause`. Chat remains usable. |
| `pause` | No queued background task executes. Chat, required chat routing/consultations, authoring, inspection and controls remain available. |
| `stopping` | No new work starts. Drain/checkpoint all owned task and conversation work, flush safe pending Git batches, then clean up and exit. |

These are service states, not task phases or client-local flags. `stopped` is not a fifth live state: after exit there is no running service. A client may display that observed outcome or a disconnected diagnostic. Force stop is an immediate action, not another state.

Pause is **reason-composed** rather than one boolean. Soft/hard health are pause-reason properties, not additional lifecycle states. The current pause suspends automatic new background work, not conversation. Empty queue, backoff or a blocked prerequisite are waits/phases rather than pause reasons unless a domain explicitly creates one.

Draining does not suspend or restart harnesses. Let every active task finish its ordinary bounded execution, checks and result persistence, or safely checkpoint an interrupted, failed or human-waiting phase under [recovery](recovery.md). A human reply is not required merely to complete shutdown when ownership can safely be released. During pausing/pause, do not start queued background follow-ups, task-assignment Router work, Teacher, Fixer or discovery tasks. Conversation and everything necessary to serve it, including first-message routing and TEAM consultation, remain available even while another background task drains. Tasks authored in chat are saved but do not execute until scheduling resumes. This exception does not permit running queued work under a chat label; stopping still drains toward shutdown. Do not silently escalate a slow graceful operation to force stop.

## Pause reasons and composition

The engine maintains an ordered/set-like collection of active **pause reasons**. Background scheduling is permitted only when there is no active pause reason and lifecycle intent otherwise allows it. Adding the first reason to a running engine requests ordinary graceful pause: stop new claims, drain all active background work, then remain in `pause`. Additional reasons compose without restarting the drain.

Initial reason kinds are:

- **manual** — created by the operator's normal Pause control/command and removed by manual Resume/cancellation;
- **health** — created/removed by the per-engine [Health sub-engine](health-sub-engine.md). A health reason is soft (preventive/configured limit, incident-scoped override allowed) or hard (actual resource exhaustion, no manual override).

The model is intentionally extensible: future domains may contribute reasons such as provider/quota safety without redesigning lifecycle state. Do not implement those future examples until separately specified.

Manual and automatic reasons are independent. If Health clears while a manual reason remains, stay paused. If the operator resumes/removes the manual reason while Health remains, stay paused. If all reasons disappear while `pausing` is still draining, the engine may return to `running` once the current transition safely reconciles instead of entering a pointless stable pause.

Accepted manual pause/resume intent survives automatic OS/crash recovery under [persistence](persistence.md), independently of re-evaluated Health conditions. A normal manual Resume removes/cancels the manual reason/intent it owns; it does not erase unrelated health/future reasons. Health reasons resolve automatically from Health state, except that the operator may incident-scope override a soft Health reason through Health. Hard Health reasons are never removed by generic Resume.

The System dashboard page is the authoritative control/inspection surface for manual pause and the complete list of active pause reasons. If the only active reason is one ordinary manual pause, the compact UI may simply say **Paused**. When health/multiple reasons exist, System exposes each reason and its owner/severity. The Health page owns health incident details/allowed override and must not duplicate generic manual pause controls.

## Start directly paused

`ptbk start --paused` and equivalent global controls launch an absent engine with its manual reason active **before any scheduling opportunity**, not by starting running and then sending Pause. Controls, inspection and the ordinary explicit-chat exception work; all queued background work waits. Repeated start over a live owner preserves its state rather than adding/removing pause reasons.

## Transitions and cancellation

- Pause from `running` enters `pausing` while any background task is active, otherwise `pause` immediately. Once draining settles, `pausing` becomes `pause`.
- Ordinary stop from any live state enters `stopping` while work must drain; when there is no active work, perform orderly cleanup and exit immediately. Stopping an already paused service does not wait for a nonexistent task.
- Resume from `pause`, or cancellation of pending `pausing`/`stopping`, removes the applicable manual lifecycle intent. The engine returns to `running` only if no other active pause reason remains. It does not interrupt, replay or duplicate the active task. Cancelling a pending restart also cancels its planned replacement start.
- Changing `pausing` to `stopping`, or `stopping` to `pausing`, only changes what happens after the same set of active work settles. It does not stop and relaunch those tasks. If nothing remains active, apply the destination immediately.

Before replacing an already requested stop/restart with a pause, explicitly confirm that shutdown is being cancelled in favour of pause. In noninteractive use, report the conflict without an invisible prompt; the caller can explicitly cancel through resume and then request pause. Repeating the same pending request is idempotent, not implicit escalation. A stale confirmation cannot overwrite a newer user's decision unnoticed.

The engine serializes control decisions with task claims: after pause/stop is accepted, no next background task slips through that boundary. Chat handling under pause follows the explicit conversation exception above. Cancellation is available while a request is pending, not after irreversible shutdown has begun. Report an already completed/too-late request honestly. State and pending intent changes propagate to every attached client.

## Command and dashboard parity

| Entry point | Shared operation |
| --- | --- |
| `ptbk start --paused` | Start an absent service directly paused before any task claim; preserve live-owner idempotency. |
| `ptbk pause` | Add/request the ordinary manual pause reason and gracefully stop new background scheduling. |
| `ptbk resume` | Remove/cancel the ordinary manual pause/stop/restart intent. Return to `running` only when no independent pause reason remains. |
| `ptbk stop` | Request graceful shutdown after current work settles. |
| `ptbk stop --force`, `ptbk stop -F` | Stop owned work immediately, without waiting for task completion, then exit with best-effort owned cleanup. |
| `ptbk restart` | Gracefully stop the selected service, then start exactly one replacement for the same project and effective configuration. |
| `ptbk panic` | Confirm and force-stop all accessible local engines and owned execution; `--yes` skips confirmation. See [panic](panic.md). |

The dashboard System page exposes these same manual lifecycle operations, complete active pause reasons, cancellation/changing pending intent and an explicitly labelled force-stop action. Health-specific details/soft override live on Health. Stop and restart are not substitutes for closing a client. A second press of Stop must not silently mean force stop. Inspection and controls remain usable during `pausing`, `pause` and `stopping`.

Restart uses the ordinary stop/start lifecycle. Its drain phase is `stopping`, with visible restart intent rather than another runtime state. Do not start the replacement until the old owner has finished and released ownership. Restart from `pause` needs only immediate orderly shutdown before starting the replacement in `running`. Failure to start the replacement is reported as such, not as a successful running service. Restart preserves effective project configuration and the selected installation, and does not install an engine update implicitly.

One-shot commands distinguish request accepted/pending, cancellation and completed outcomes; acknowledging `stopping` is not proof that the service has exited. Confirm completed stop only after the selected owner has ended, not merely because its control endpoint disconnected. Reconcile an uncertain reply without blindly replaying mutations against a replacement service. Runtime-only controls create no Git commits.

## Force stop, signals and cleanup

A force request immediately terminates the selected engine and all execution processes it exclusively owns, including every concurrent harness/helper descendant and exclusively owned browser, without a graceful task-completion wait. Stopping only the parent while an owned worker continues is incomplete. Verify ownership; unrelated Node/browser processes and externally owned resources remain untouched. A shared profile browser belongs to its [connection pool](browser.md): disconnect this engine and end its owned activity, but preserve the process for other engines; the last managed connection closes it. The same operation serves per-project force stop, global Force stop all and [panic](panic.md), including bounded verified termination of an unresponsive owner. Preserve whatever interruption evidence is available, never mark unfinished work done, and make a bounded best-effort cleanup through the owning service, including its own lock. Force stop while already in `pause` has no background task to drain, but still terminates any owned in-flight conversation work according to the force-stop contract before cleanup. A paused chat is not a separate engine or an exemption from explicit shutdown.

A catchable graceful termination request delivered to the engine by the operating system follows graceful stopping where the host permits it. A signal delivered only to an attached dashboard closes that client; it is not forwarded as an engine stop request. An externally imposed uncatchable kill may prevent all cleanup, leaving lock records behind. This is the deliberate difference between internal force stop and an external hard kill; there is no promised cleanup or new next-start lock-removal requirement for that case. The owner-cleanup rules are in [locking](locking.md).

An intentional completed stop, including force stop/panic, ends the service and suppresses immediate supervisor/pending replacement. Retain its registry and enabled persistence registration: next OS startup restores it paused for control, with no queued task execution. Previously running/Health-only-paused agendas may resume after current checks; manual/combined pause remains paused. Cancellation clears pending stop intent. Unexpected disappearance/ambiguous external kill never authorizes automatic work resumption; any restored service is paused, without changing the hard-kill cleanup limitation.

## Acceptance outcomes

Exercise all four states through commands, two terminal clients, browser and API. Pause/stop an active task and verify it drains exactly once with no next claim. Compose manual + soft Health + hard Health reasons and verify scheduling resumes only after all applicable reasons are removed/resolved. Generic Resume never clears Health. Soft Health override affects only its incident; hard Health cannot be overridden. Cancel pending states and switch intent without restarting the task; confirm stop-to-pause replacement and reject stale conflicting requests. Pause an idle engine immediately, then resume, stop or restart it. Force stop has no waiting state, terminates all owned execution and attempts bounded cleanup, including while paused. Stop/panic prevents immediate replacement and next boot restores those persistent services only paused; no owned child or recovered service resumes their queued work before explicit Resume. Closing any observing client never invokes these operations.
