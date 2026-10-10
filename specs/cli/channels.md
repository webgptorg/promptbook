# Interaction channels

[Main specification](../_main.md)

Keep three concepts separate: an agent's TEAM relationship, a request needing human input, and the channel carrying that request or its answer.

An interactive foreground process presents questions directly in the terminal. A daemon exposes them through the lightweight page and REST API, and through `ptbk answer`: it can list/select pending requests and submit an answer or decision. Noninteractive use must support identifying the request and supplying the response explicitly.

The CLI answer path works even when the HTTP server is disabled. Raw mode never reads an invisible interactive prompt; it reports pending requests and how to answer them. Status/show also surface unanswered requests without consuming or answering them.

All channels operate on the same durable requests and controls. No channel may grant additional authority, create a second response to an already-resolved request or require the task to be rerun to receive its answer. Other channels can be added without redefining TEAM or request semantics.

See [shared controls](controls.md), [user interactions](user-interactions.md), [terminal](terminal.md) and [dashboard](dashboard.md).
