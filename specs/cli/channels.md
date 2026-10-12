# Interaction channels

[Main specification](../_main.md)

Keep three concepts separate: an agent's TEAM relationship, a request needing human input, and the channel carrying that request or its answer.

Interactive questions in an attached `ptbk dashboard` or owning foreground session use the shared [text-entry and UI contract](interactive-ui.md), without corrupting the live dashboard. A daemon exposes the same requests through that terminal client, the lightweight [browser SPA](dashboard.md), the independently usable [API](api.md) and `ptbk answer`, which can list/select requests and submit an answer or decision. Noninteractive use identifies the request and supplies the response explicitly rather than opening a prompt.

The CLI answer path works even without HTTP. Raw mode never reads invisible interactive input; it reports pending requests and how to answer them. Status/show surface unanswered requests once without consuming or answering them. Closing an attached dashboard does not cancel a pending request or stop its service.

All channels operate on the same durable requests and controls. No channel grants additional authority, creates a second response to an already-resolved request or requires a task rerun to receive its answer. Other channels can be added without redefining TEAM or request semantics.

See [shared controls](controls.md), [user interactions](user-interactions.md), [terminal](terminal.md) and [dashboard](dashboard.md).
