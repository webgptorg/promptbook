# Terminal runtime dashboard

[Main specification](../_main.md) · [CLI presentation](interactive-ui.md) · [Global dashboard](global-dashboard.md)

## Attaching and lifetime

`ptbk dashboard` opens a live terminal client for the selected project's existing engine; `--path` selects the project. Verify the owner before connecting. Opening/reopening the view neither initializes nor starts a supervisor, acquires its lock, claims work or changes runtime configuration. A missing/unreachable service produces an actionable unsuccessful result, including how to start the selected project, rather than an empty successful per-project view.

An engine can have zero, one or many concurrent dashboards, including several terminals opened in the same project. They all observe and control the same state. The client runs until the user leaves or the service ends, with no wizard steps or overall countdown. Q, Ctrl+C and terminal disconnection close only this client. Closing all clients leaves the daemon running. Service exit/lost connection is shown truthfully and never starts a replacement.

`ptbk dashboard --global` opens the separate host-wide live overview from any directory. Unlike a per-project dashboard with no service, it remains open with zero entries. Selecting an engine attaches to its project view without `cd`, creating work or starting a process; returning to the overview leaves that engine alone.

Explicit foreground start and finite run may present the same state/control experience, but their invocations own engine execution rather than being attached dashboard clients. In an owning foreground invocation, termination signals use the engine's graceful [lifecycle](service-lifecycle.md) and preserve recovery state. They never kill unrelated Node processes or user browsers. Run retains its finite outcome.

## State and presentation

Use the live [shared status view](status-view.md) and [panel layout](dashboard-layout.md). Keep the actual engine version, selected project, connection and four-state service status visible. Current work identifies the agent, task, phase and honest waits/blockers; detailed actual harness/model/thinking metadata is available together in an initially collapsed [execution panel](dashboard-details.md). A separate collapsed browser panel identifies the effective profile and provides diagnostics and safe repair controls. Do not substitute configuration defaults or stale last-run data for actual activity.

[Chats awaiting a human answer](user-interactions.md) have highest attention priority: actionable count, actual agent author, affected work and a direct open-thread action. Unread and waiting are distinct; all chats remain reachable. Manager assignment/discovery are labelled automatic work, not requests. Idle states explain their reason rather than invent progress.

Use readable aligned panels, semantic indicators and bounded activity/detail output. Separate agent messages, checks and failures; errors include a summary, next action and redacted evidence. A collapsed browser panel does not hide an actionable launch failure. Harness catalog browsing follows [featured/More](harness-plugins.md), while actual execution remains inspectable regardless of featured status. Show verified connection URL/QR subject to raw/no-QR/capability rules.

Terminal, browser and API expose equivalent engine state and shared controls. Changes through any client propagate to the others; focus, scroll, drafts and collapsed panes remain local presentation choices.

## Keyboard controls

Provide a discoverable legend and fully keyboard-operable main service-control panel. Retain C for new chat, A for the highest-priority waiting conversation and access to all chats. C uses the [Chatter-first picker](chat-ui.md): Enter chooses Chatter; choosing another agent opens the complete valid list. A opens the existing authored thread instead of rerouting it. Chat uses the rich composer; Ctrl+C inside it closes that chat view/client, not the service. Global keys never capture composer/picker input.

Retain P for state-appropriate pause/resume and S for skipping a real pacing/backoff wait without bypassing conditions. X requests **graceful** service stop; repeating it does not silently escalate. The visible panel also exposes restart, explicit force stop, cancellation of pending pause/stop and changing pending intent. Give each action a clear label/shortcut or focusable control and show any required stop-to-pause confirmation. All call the [same operations as CLI commands](service-lifecycle.md), including `ptbk stop -F`; service stop is visibly different from leaving the viewer.

Provide shortcuts to open/close the execution and browser detail panels without hiding main lifecycle actions. Browser recheck, startup retry and restart use the engine's coordinated [browser controls](browser.md), not terminal-local process killing. O switches dashboard/plain presentation in an interactive session; arrow keys and End support scrolling/following activity. Resize preserves input and feedback.

## Raw output

Raw/noninteractive dashboard use continuously streams readable state/events without color, cursor sequences or prompts. Retain execution/browser diagnostic information, addresses and conspicuous attributed waiting-chat notices without QR art. Use status/show for a one-shot snapshot. O changes presentation, not authorization or input policy; never resubmit work. Keep output bounded and truncation explicit, without fabricated progress, cost or remaining time.

Lifecycle commands report one operation outcome/snapshot without attaching this view. See [process modes](process-modes.md), [channels](channels.md) and [traces](traces.md).
