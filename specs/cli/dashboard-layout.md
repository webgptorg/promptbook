# Dashboard panel layout

[Main specification](../_main.md) · [Shared status view](status-view.md) · [Expandable details](dashboard-details.md)

Terminal and browser project dashboards are a coherent **operational cockpit** with separated labelled panels, not one rectangle of logs. Use consistent padding, spacing, alignment and boundaries. The hierarchy also applies to pretty one-shot snapshots; exact grid/rendering technology is not prescribed. The [global dashboard](global-dashboard.md) remains a separate host-wide table, not this project panel grid or another engine.

Keep a compact project/version/service-state header and these functional regions:

| Region | Content and priority |
| --- | --- |
| Needs your attention | Actual agent-authored chats awaiting User, linked work and direct thread actions. Unread and all-chats access are distinct. Highest priority. |
| Current work | Agent identity, task, phase and truthful wait/blocker, with execution-detail access. |
| Service controls | Always-discoverable pause/resume, pending-intent cancellation/change, graceful stop, explicit whole-engine force stop and restart. |
| Tools | Compact named browser/harness availability, enabled/in-use summaries and access to shared tool management and individual diagnostics. |
| Synchronization | Compact Git synchronization state and drill-down/manual-cycle access, **only when autosync is enabled**. |
| Agents / team | All available agents, actual activity, per-agent queued work and drill-down into source/chat. |
| Chats | Existing conversations, new Chatter-first entry and unread/actionable states. |
| Tasks | Complete sortable task inventory, smart current-work view and Tasker-first authoring. |
| Results and activity | Compact outcomes/statistics and a separately bounded diagnostic/activity area. |
| Connection | Verified local/remote dashboard availability, URL/QR and access guidance, secondary to work and attention. |

Verbose execution, tool configuration/individual browser diagnostics and synchronization status use the same **initially collapsed detail pattern**, keyboard-accessible with labelled controls. Follow [detail contracts](dashboard-details.md); never dump every model/credential field into the main view. A concise actionable failure remains visible while details are closed. Enabling/disabling is the primary tool-management path; permanent removal is secondary, not an easy accidental primary action.

Show engine lifecycle states `running`, `pausing`, `pause` and `stopping` independently of task/resource/synchronization phases. Waiting for a missing browser/harness is compatible with running, not a new lifecycle state or a technical pause. Failed pull/push can coexist with active local work. Lifecycle controls are not hidden in tools or synchronization details. Shared confirmations and outcomes come from [service lifecycle](service-lifecycle.md), not UI-specific semantics; an observed exited service is not a fifth live state.

On wide terminals/screens, several panels remain simultaneously distinguishable with aligned edges. On narrow screens, stack/compact by priority while retaining attention, live state and lifecycle actions. Secondary detail can scroll/collapse in labelled regions. Never hide required actions under logs, shrink text to unreadability, clip QR codes or let agent artwork cover controls. Empty queues and resource waits have meaningful concise states.

Update live regions without flicker, moved focus, lost drafts, reset scroll or repeated frames in scrollback. Background tool/sync updates must not steal the current editor. A snapshot renders once; raw output uses labelled plain sections. A viewer's focus and collapsed panes are local presentation state and do not change the engine or another viewer.

## Spatial navigation and agent/task views

Retain existing discoverable letter shortcuts as direct actions. At panel level, arrow keys move focus spatially between visible regions; highlight the focused panel without automatically enlarging it or rearranging the grid. Enter drills into that panel; Escape returns one level. Escape at the root exits only the dashboard, never the engine. Inside a list/editor, its arrows/Enter/Escape follow that local control until returning to the parent. Preserve selection, scroll and drafts across drill-down and refresh.

Agents, Chats and Tasks are separate panels, not three labels for the active task. The team inventory includes all project/core agents and the engine Expert where referenceable, with an honest distinction between model-backed targets and non-speakers. Show each agent's actual current activity and assigned queue, not a fabricated permanent worker per agent. Detail provides its source, current/queued work, direct chat and [source editing](book-editor.md) for project-owned Books. Core hiding in automatic goal discovery does not hide roles from this explicit complete inventory.

Tasks uses the [complete smart task view](task-views.md); Chats uses the [Chatter-first conversation flow](chat-ui.md). Promote Tasker for task creation/management. Agent/chat/task inventories support ordinary sorting by applicable displayed fields; preserve viewer choices without changing engine state. These are UI policies over the same service; navigation never changes scheduling or commits sources.

## Acceptance outcomes

Exercise wide/narrow terminal/browser layouts, zero tools, busy work, empty queues, long identifiers/URLs, multiple waiting chats and resizing during replies/tool edits. Main lifecycle actions and concrete resource waits stay visible. Drill into execution, tools, a browser and enabled synchronization with keyboard-only navigation. Disabled sync has no dedicated panel. Two clients show the same shared state and accepted changes while preserving their independent focus/panel choices. No log, avatar or connection box obscures required controls.
