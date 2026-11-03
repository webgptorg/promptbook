# Self-naming terminal titles

[Main specification](../_main.md) · [Agent visual identity](../agents/visual-identity.md) · [Terminal dashboard](terminal.md) · [Attention and notifications](notifications.md)

Interactive Promptbook terminal UIs identify themselves in the host terminal's tab/window title without VS Code settings, extensions or process-name tricks. This is part of the normal pretty interactive experience and must work reliably in common terminals, including VS Code.

## Exact dashboard title shape

For an ordinary project dashboard, the visible title is intentionally minimal:

`<status-marker> ptbk <animated-single-line-agent-visual> <project-name>`

Standalone `ptbk chat` and nested project pages reuse the same project status prefix and agent/title core; a concise existing conversation label may follow the project where useful. They do not create another title controller or animation loop.

For the global dashboard:

`ptbk <animated-default-agent-visual> Global`

Other than the specified project status marker, do not prepend the book emoji, the word `Promptbook`, engine version, path, mode, task title or other verbose context to this title. Those details exist inside dashboard pages. The global dashboard keeps its existing shape; global notification/status ownership is explicitly deferred.

Reuse the **same single-line agent visual identity/animation** used by Promptbook's terminal agent visuals; do not invent a parallel spinner/mascot system merely for the title.

When a project has a currently working agent, render that agent's single-line visual. When no agent is actively working, use the stable default Promptbook agent visual rather than leaving a stale previous worker. The global dashboard always uses the default visual because it represents several independent project engines, not one current agent.

## Project status marker

| Observed state | Marker with motion enabled |
| --- | --- |
| `running`, including idle with no task | 🟢 |
| `pausing` | Alternate 🟢 / ⚪ |
| `pause` | ⚪ |
| `stopping` | Alternate 🟢 / 🔴 |
| Confirmed stopped owner | 🔴 |
| Current unseen chat/Wallet attention or unresolved actionable Health/system incident | Alternate 🟡 / 🔔, taking precedence over the lifecycle marker |
| Lost connection or unverified state | Explicit unknown marker/label, never a claim of stopped |

The attention override and lifecycle marker describe the same shared state as the project views. Seen chat/Wallet occurrences stop contributing to attention without resolving the wait; another outstanding occurrence or actionable Health/system incident still takes precedence. An idle running engine is green, not paused. Connection loss does not prove that the engine stopped.

With reduced motion use a stable meaningful marker and concise state text where needed to distinguish Pausing, Stopping, Attention and Unknown. Terminals without safe Unicode use equivalent readable text. The marker is independent of the experimental Sounds & notifications switch; turning effects Off does not turn it off. An explicit terminal-title opt-out still disables all title writes.

## Animation and reassertion

The single-line visual is animated while motion is allowed. Dashboard repaint, agent-character motion and status-marker/title animation use **one per-terminal render/animation scheduler**, a shared monotonic frame time and one bounded frame-rate budget. Different motions can advance at different rhythms derived from that time; do not retain separate title, mascot and dashboard render intervals. Nested chat/pages reuse the same scheduler rather than adding another loop.

Advance/rewrite the title at a lightweight bounded cadence sufficient for the character's existing movement to be visible. It is acceptable and desirable to re-emit the title periodically while the dashboard is open rather than writing only once on a semantic state change. Derive this cadence from the common scheduler; state polling/event collection remain independent and do not become render loops. Apply [coalescing/backpressure](dashboard-layout.md#rendering-under-slow-or-hidden-terminals) without replaying obsolete title frames or blocking engine/input work. Rendering never generates notification/sound effects.

Periodic reassertion exists both to animate the character and to recover when a shell/terminal integration (notably VS Code) restores a generic label such as `node`. Title writes must not request keyboard focus, change the dashboard's focused tile/page, inject input, flood scrollback or trigger engine work.

When reduced motion is requested, keep a stable still frame but the implementation may still periodically reassert that same title so terminal integrations do not permanently overwrite it.

Switch immediately to another agent's visual when the observed current worker changes. Returning from an embedded chat/editor/page must restore/reassert the dashboard title.

## Terminal mechanism and gating

Use the standard terminal tab/window title control sequence (OSC 0 or OSC 2), not the OS process name. The title must be safe for common Bash/Zsh terminals, Windows terminals that support the sequence, and the VS Code integrated terminal.

Promptbook dashboard is pretty and interactive by default when stdin/stdout are suitable TTYs. Title updates are therefore enabled by default in that ordinary case.

Never emit title controls into redirected output, raw/`--no-ui`, JSON/machine-readable or noninteractive use. Unsupported terminals continue normally without visible escape garbage. `--no-terminal-title` and the documented environment opt-out disable all Promptbook title writes.

Sanitize all dynamic project/visual text: strip control characters/escape sequences, force one line and cap total width. An agent/project name can never inject another terminal command.

Restoration on exit is best-effort according to terminal capabilities. VS Code or other terminals that do not preserve a title stack may be cleared/returned to their own default rather than leaving a stale ptbk title.

## Acceptance outcomes

Run bare `ptbk dashboard` in VS Code with no flags: the tab stops showing the generic `node` label and continuously shows the current status marker, `ptbk`, the animated single-line current-agent visual and project name. Let the terminal sit unattended, then work in it; title animation/reassertion does not steal focus and works with sound/desktop effects Off.

Switch the active agent and observe the visual change. Let the engine go idle and observe the default visual. Open/return from nested dashboard pages/chat/editor and retain the ptbk title.

Exercise running/idle, pausing, pause, stopping, confirmed stopped and disconnected/unknown states. New attention overrides the marker; seeing only the relevant chat/Wallet occurrence removes its contribution across clients without unblocking work or clearing Health. Verify one shared scheduler/frame budget across status, character and dashboard, including standalone/embedded chat, reduced motion and hidden/slow terminals.

Run `ptbk dashboard --global`: show `ptbk <animated default visual> Global`. Verify raw, redirected, noninteractive and `--no-terminal-title` output contains no OSC title controls. Test sanitization, reduced motion and terminals that overwrite labels.
