# Dashboard panel layout

[Main specification](../_main.md) · [Shared status view](status-view.md)

The terminal and browser dashboards are composed of clearly separated, labeled panels, not one large rectangle containing all information as a text dump. Use consistent padding, spacing, alignment and visual boundaries. A single outer frame with headings inside is not sufficient. The shared information hierarchy also applies to pretty one-shot status snapshots; the exact grid and rendering technology are not prescribed.

Keep a compact project/version/service-state header and a discoverable control area. Arrange the content into these functional regions:

| Region | Content and priority |
| --- | --- |
| Needs your attention | Chats awaiting User, actual agent authors, linked work and direct open-thread actions. Show unread chat count separately and access to all chats. Highest priority, visible before routine content, with access to the full ongoing conversation rather than a separate request form. |
| Current work | Agent mascot badge/name, current task, explicitly labeled harness, model and thinking level for the current execution, phase and honest wait/blocker information. This is the primary operational panel. |
| Queue | Upcoming work and readiness/dependency summaries, with a bounded way to inspect detail rather than flooding the screen. |
| Results and activity | Compact outcomes/statistics and a separately bounded activity/diagnostic area. Routine logs never consume the whole dashboard. |
| Connection | Local/remote availability, usable URL, QR code and access guidance. Secondary to human attention and work; not a replacement for status. |

The current-work panel makes the agent, harness, concrete model name/identifier and thinking level readable together without opening logs or a separate detail screen. Showing only the agent or a provider name does not satisfy this requirement. Use the effective values for the current execution, including applicable overrides, rather than presenting project or agent defaults as the running configuration. Update the fields when the execution context changes; do not carry values from a previous run into new work.

Keep thinking-level values faithful to the harness's terminology; do not invent equivalences between harnesses. If a model or thinking level cannot be determined, label it as unknown or not reported. Distinguish a genuinely unsupported/not-applicable thinking level from an unknown value, and label automatic/default selection as such when its concrete resolution is unavailable. Idle or stopped states must not imply that a previously used configuration is currently running. The same information is retained in browser and terminal views, applicable status snapshots and raw text output.

On a normal wide screen or terminal, several panels are simultaneously distinguishable, with a main work area and smaller supporting areas. In the browser, use a responsive card/grid composition; in the terminal, use titled panes with visible separation and aligned edges. Stable placement lets a user find requests, current work and connection details at a glance. Agent badges are integrated into panels, not floating over controls or QR codes.

On narrow windows, stack or compact panels in priority order. Preserve visible attention summaries, current state and actionable controls; secondary content can scroll or collapse in labeled areas. Do not solve overflow by shrinking text beyond readability, clipping a QR code or losing a pending request. Empty queues and idle work have meaningful compact states, not large meaningless placeholders.

Update individual live regions without repaint flicker, moving focus, resetting scroll/drafts or repeatedly appending frames to scrollback. New activity cannot displace a request response being edited. Show applicable keys/focus in the terminal and labeled accessible controls in the browser. A snapshot renders the same grouping once and exits; raw output translates the groups into clear text sections without borders or cursor control.

Acceptance includes wide and narrow terminal/browser views, a busy queue, an empty queue, long task names/URLs, multiple pending chats, resizing while composing a reply and a one-shot status. Information is visibly divided into panels, request priority survives every layout, and no avatar, log or QR area obscures controls or other panels.

For active work, verify that agent, harness, model and thinking level are visible together, including when the effective execution settings differ from defaults. Verify updates between runs, automatic selection, unavailable model/level metadata and a harness without thinking-level support. No view substitutes a guessed value or a previous run's settings for the current execution.
