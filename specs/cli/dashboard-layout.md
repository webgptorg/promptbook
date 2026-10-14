# Dashboard panel layout

[Main specification](../_main.md) · [Shared status view](status-view.md)

The terminal and browser dashboards are composed of clearly separated, labeled panels, not one large rectangle containing all information as a text dump. Use consistent padding, spacing, alignment and visual boundaries. A single outer frame with headings inside is not sufficient. The shared information hierarchy also applies to pretty one-shot status snapshots; the exact grid and rendering technology are not prescribed.

Keep a compact project/version/service-state header and a discoverable control area. Arrange the content into these functional regions:

| Region | Content and priority |
| --- | --- |
| Needs your attention | Pending human requests, affected work and direct response actions. Highest priority, visible before routine content, with room to expand a request. |
| Current work | Agent mascot badge/name, current task, harness/model, phase and honest wait/blocker information. This is the primary operational panel. |
| Queue | Upcoming work and readiness/dependency summaries, with a bounded way to inspect detail rather than flooding the screen. |
| Results and activity | Compact outcomes/statistics and a separately bounded activity/diagnostic area. Routine logs never consume the whole dashboard. |
| Connection | Local/remote availability, usable URL, QR code and access guidance. Secondary to human attention and work; not a replacement for status. |

On a normal wide screen or terminal, several panels are simultaneously distinguishable, with a main work area and smaller supporting areas. In the browser, use a responsive card/grid composition; in the terminal, use titled panes with visible separation and aligned edges. Stable placement lets a user find requests, current work and connection details at a glance. Agent badges are integrated into panels, not floating over controls or QR codes.

On narrow windows, stack or compact panels in priority order. Preserve visible attention summaries, current state and actionable controls; secondary content can scroll or collapse in labeled areas. Do not solve overflow by shrinking text beyond readability, clipping a QR code or losing a pending request. Empty queues and idle work have meaningful compact states, not large meaningless placeholders.

Update individual live regions without repaint flicker, moving focus, resetting scroll/drafts or repeatedly appending frames to scrollback. New activity cannot displace a request response being edited. Show applicable keys/focus in the terminal and labeled accessible controls in the browser. A snapshot renders the same grouping once and exits; raw output translates the groups into clear text sections without borders or cursor control.

Acceptance includes wide and narrow terminal/browser views, a busy queue, an empty queue, long task names/URLs, multiple pending requests, resizing while answering and a one-shot status. Information is visibly divided into panels, request priority survives every layout, and no avatar, log or QR area obscures controls or other panels.
