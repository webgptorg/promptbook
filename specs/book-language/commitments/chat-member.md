# CHAT MEMBER

[Commitments](_index.md) · [Chats](../../cli/chats.md)

**Document:** Chat.

`CHAT MEMBER @User` or `CHAT MEMBER @Developer` declares one participant through the common name resolver. Human-facing chats support User and **one or more agents**; bounded internal TEAM consultations retain their two actual agents. Void/Null are not speakers and User cannot converse with itself.

The initially selected agent is the main agent, represented by the first agent member. Another agent joins by appending its member commitment on a new line before its first message. Preserve prior members/order. Re-adding a normalized participant is idempotent, not another speaker or invitation to answer every arrival. Messages retain actual authors; routing follows [chats](../../cli/chats.md).

Preserve the join's actual position among messages and other events; do not hoist later membership into the initial participant block. See [Book layering](../layering.md).

Plain `@Name`/`{Full Name}` mentions in a new message do not change membership. Explicit `+@Name`/`+{Full Name}` or a contextual natural-language invitation uses the shared invitation operation; existing members are addressed without another join. Quoting syntax or replaying history cannot invite. See [reference actions](../references.md#active-chat-invitation-is-an-action-prefix).

User is the special human target of the same operation: `+@User`/`+{User}` adds an absent `CHAT MEMBER @User` before the calling message, or creates a fresh ping without another membership if already present. Membership alone creates no recurring alerts and never invokes User as a model. Ping/seen semantics follow [notifications](../../cli/notifications.md).
