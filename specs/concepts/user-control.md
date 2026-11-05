# User control takes priority

[Main specification](../_main.md) · [Autonomy and minimal interruption](minimal-interruption/_index.md) · [Directing existing work](../cli/task-control.md)

The user sets the goals, limits and current direction of the project. They can inspect work, intervene at any point, change the instructions, take over a supported resource or stop the affected operation. A newer applicable instruction takes precedence over an agent's plan. Apply it through the shared controls at the first safe boundary and report what has taken effect, what is pending and which external effects already happened.

## Protect the work the user is doing

Keep the user's active inputs, drafts, navigation and explicitly controlled resources under their control. Background updates may report progress without taking focus, submitting input or overwriting active work. A window's focus, visibility or minimized state alone does not establish user intent. Actual interaction matters for attention. An explicit takeover has its own ownership and release rules and stays in force even when the user is idle or the window is in the background.

Where the user takes exclusive control, automation yields the affected resource before the user can act. Checkpoint conflicting work and report what is waiting. Keep safe independent work running. The user may retain control for as long as they need without routine reminders or a takeover timer. Apply the domain's explicit handoff or cancellation rules. In particular, closing the [browser control surface](../cli/browser-tab-control.md#exclusive-control-and-handoff) ends its transport and does not authorize an agent to take the tab back.

## Keep unattended work useful

With no user intervention, agents continue authorized work and resolve routine details using available context, tools and ordinary recovery. Ask only when a decision, input or action is genuinely needed, and keep optional choices quiet and easy to decline. Closing a client does not cancel the agenda. Explicit engine controls, project authority and already completed external effects retain their ordinary semantics.
