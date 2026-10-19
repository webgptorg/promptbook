# Dashboard panel layout

[Main specification](../_main.md) · [Shared status view](status-view.md) · [Expandable details](dashboard-details.md)

The terminal and browser project dashboards use clearly separated, labelled panels, not one large rectangle containing a text dump. Use consistent padding, spacing, alignment and visual boundaries. The shared hierarchy also applies to pretty one-shot status snapshots; exact grid and rendering technology are not prescribed. The [global dashboard](global-dashboard.md) has its own table-oriented layout and is not this project's panel grid.

Keep a compact project/version/service-state header. Arrange content into these functional regions:

| Region | Content and priority |
| --- | --- |
| Needs your attention | Chats awaiting User, actual agent authors, linked work and direct open-thread actions. Unread count and all-chats access remain distinct. Highest priority, visible before routine content. |
| Current work | Agent mascot badge/name, current task, phase and honest wait/blocker information. This is the primary operational summary, with access to execution details. |
| Service controls | Always-discoverable main panel for pause/resume, pending-intent cancellation/change, graceful stop, explicitly labelled force stop and restart. Show the engine's live state and whether a request is still draining. |
| Queue | Upcoming work and readiness/dependency summaries, with bounded access to details. |
| Results and activity | Compact outcomes/statistics and a separately bounded activity/diagnostic area; routine logs never consume the whole dashboard. |
| Connection | Local/remote availability, usable URL, QR and access guidance, secondary to attention and work. |

Technical execution configuration and browser diagnostics are separate **initially collapsed detail panels**, reachable by discoverable keyboard shortcuts and browser controls. The expanded execution panel shows agent, effective harness, model and thinking level together, including unavailable/not-applicable distinctions and overrides. Browser detail shows the effective profile source/path, health, diagnostics and safe recovery actions. Follow [detail-panel contracts](dashboard-details.md) rather than always showing these verbose fields in the main current-work region. A concise actionable failure remains visible even while detail is collapsed.

Service lifecycle controls are not hidden in either detail panel. Display `running`, `pausing`, `pause` and `stopping` from the engine, with appropriate actions for each. Cancelling pending pause/stop resumes `running`; changing draining intent does not interrupt the active task. Show confirmations and outcomes from [shared lifecycle](service-lifecycle.md), not dashboard-specific semantics. An observed service exit may be labelled stopped, but is not a fifth running-service state.

On a normal wide screen/terminal, several panels are simultaneously distinguishable. Use responsive browser cards/grid and titled terminal panes with aligned edges. Stable placement lets users find attention, work, controls and connection details. Agent badges never float over controls or QR codes.

On narrow windows, stack or compact panels in priority order. Preserve attention summaries, live state and lifecycle actions; secondary content can scroll or collapse in labelled regions. Do not solve overflow by unreadably small text, clipped QR codes or lost requests. Empty queues and idle work have meaningful compact states.

Update live regions without flicker, focus moves, lost drafts or scroll resets, or repeated frames in scrollback. New activity cannot displace a response being edited. Show applicable keys/focus and accessible browser labels. A snapshot renders the grouping once; raw output uses clear text sections without borders/cursor control. A viewer's collapsed panels and focus are presentation state only; changing them never changes the engine or another viewer's layout.

## Acceptance outcomes

Exercise wide/narrow terminal/browser views, an empty or busy queue, long names/URLs, multiple waiting chats, resizing while replying and one-shot status. Panels remain distinct, lifecycle controls stay directly reachable and attention survives every layout. Open both technical panels by keyboard and inspect actual run/profile information without logs or configuration changes. Verify every lifecycle state and change from two clients: both show the same engine state, while each retains its own focus and panel choices. No avatar, detail panel, log or QR area obscures required controls.
