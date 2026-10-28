# CHAT STATUS

[Commitments](_index.md) · [Chats](../../cli/chats.md)

**Document:** Chat.

`CHAT STATUS open|waiting-for-user|resolved` describes the conversation's durable action state. `waiting-for-user` requires a concrete unanswered agent message, decision or human-only action; it is not inferred merely from who spoke last. Accepting/saving a user response immediately resolves that question's attention, before agent acceptance or Git batching. Other unanswered questions retain their state; aggregate chat status reflects them. Read/unread presentation per local viewer is separate from durable action state; reading never answers or approves a request.

A new chat without a status commitment is implicitly `open`; do not write an initial open line. Append each real transition chronologically rather than replacing an earlier status. The last valid nonliteral status wins; an unchanged/read-only operation adds none. See [Book layering](../layering.md).
