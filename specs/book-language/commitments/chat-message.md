# CHAT MESSAGE

[Commitments](_index.md) · [Chats](../../cli/chats.md)

**Document:** Chat.

A repeated `CHAT MESSAGE <sender-reference> <timestamp>` commitment begins a durable message by a declared participant. Its natural-language body continues until the next commitment/message, preserving source order, attachments and text. A stored message **must be lossless**: literal quoting/escaping of user text that resembles Book controls or fences is required so untrusted pasted `TASK`, `RULE`, `CHAT MESSAGE`, braces or links never become executable commitments solely by being quoted in a message. A timestamp identifies a turn's time, **not** an entity ID; duplicate timestamps may exist. A message may ask for a human answer or report an answer, as expressed through chat attention state. In ordinary human-facing chats each newly accepted user/agent message is its own Git operation and commit; task-internal agent consultations join the parent task's result commit.
