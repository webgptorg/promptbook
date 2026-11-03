# CHAT STATUS

[Commitments](_index.md) · [Chats](../../cli/chats.md)

**Document:** Chat.

`CHAT STATUS open|waiting-for-user|resolved` describes the conversation's durable action state. `waiting-for-user` requires a concrete unanswered agent message, decision or human-only action; it is not inferred merely from who spoke last. Accepting/saving a user response immediately resolves that question's attention, before agent acceptance or Git batching. Other unanswered questions retain their state; aggregate chat status reflects them. Unread and project-shared durable seen state are separate from this action state. Seeing an explicit User ping clears that occurrence's alert across clients but appends no status transition, answers nothing and never approves or unblocks work. See [attention policy](../../cli/notifications.md#seen-is-separate-from-resolved).

Verified automatic resolution under [attention ownership](../../cli/notifications.md#withdraw-obsolete-requests-without-rewriting-history) can also clear a dependency without a User reply. Preserve the historical question and its active User prefix, append the responsible agent's explanation and derive aggregate status from all remaining human dependencies. Clearing A cannot resolve a chat still waiting on B, and a chat-wide status cannot block an independent task whose prerequisites are already satisfied. The resolution message follows ordinary unread semantics without creating another active User ping.

A new chat without a status commitment is implicitly `open`; do not write an initial open line. Append each real transition chronologically rather than replacing an earlier status. The last valid nonliteral status wins; an unchanged/read-only operation adds none. See [Book layering](../layering.md).
