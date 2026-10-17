# CHAT STATUS

[Commitments](_index.md) · [Chats](../../cli/chats.md)

**Document:** Chat.

`CHAT STATUS open|waiting-for-user|resolved` describes the conversation's durable action state. `waiting-for-user` requires a concrete unanswered agent message, decision or human-only action; it is not inferred merely from who spoke last. Appending an actual answer updates the state in that message's atomic save/commit. Read/unread presentation per local viewer is separate from durable action state; reading never answers or approves a request.
