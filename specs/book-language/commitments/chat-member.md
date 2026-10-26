# CHAT MEMBER

[Commitments](_index.md) · [Chats](../../cli/chats.md)

**Document:** Chat.

`CHAT MEMBER @User` or `CHAT MEMBER @Developer` declares one participant through the common name resolver. Human-facing chats support User and **one or more agents**; bounded internal TEAM consultations retain their two actual agents. Void/Null are not speakers and User cannot converse with itself.

The initially selected agent is the main agent, represented by the first agent member. Another agent joins by appending its member commitment on a new line before its first message. Preserve prior members/order. Re-adding a normalized participant is idempotent, not another speaker or invitation to answer every arrival. Messages retain actual authors; routing follows [chats](../../cli/chats.md).
