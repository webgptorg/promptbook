# Interaction channels

[Main specification](../_main.md) · [Chats](chats.md)

Keep separate **who communicates** (a Chat Book's participants), **what requires attention** (a waiting message/action and linked task) and **where the user sees it** (terminal chat, attached dashboard, browser SPA, API or CLI answer compatibility). No channel creates a separate request entity or separate task runner.

`ptbk chat` opens a new user↔agent conversation directly, without the dashboard; terminal/dashboard/browser/API expose the same existing chat names, message history, composer, linked tasks and response semantics. `ptbk answer` targets a selected waiting chat for backward compatibility. A foreground or attached dashboard can enter its full chat view; status/show merely report actionable and unread summaries. Raw/noninteractive invocation never blocks on invisible input.

Actions and messages from every client use shared ownership, project authentication, Git persistence and idempotency. A reply committed in one channel appears in all others and cannot be duplicated by reconnect or stale UI. Closing any client does not cancel a chat, queued task or running service. Channel differences may change input presentation but not a speaker's identity or thread content.

See [chat UI](chat-ui.md), [service API](api.md) and [user interactions](user-interactions.md).
