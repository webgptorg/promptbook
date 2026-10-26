# CHAT MESSAGE

[Commitments](_index.md) · [Chats](../../cli/chats.md)

**Document:** Chat.

A repeated `CHAT MESSAGE <sender-reference> <timestamp>` commitment begins a durable message by a declared participant. It is one multiword commitment in the common grammar, not a new CHAT declaration or another entity. Optional `progress` or `final` phase after the timestamp distinguishes interim updates and final reply; omitted phase is an ordinary message. Preserve originating-turn/question/task correlation durably. Its natural-language body continues until the next commitment/message, preserving source order, attachments and text.

A stored message **must be lossless**: literal quoting/escaping of supplied text that resembles Book controls or fences is required so pasted AGENT, TASK, CHAT, RULE, CHAT MESSAGE, brace references or links never become structural or executable commitments solely by being quoted in a message. Preserve arbitrary text without changing the original message or letting it rename/retype its containing Book.

A message timestamp identifies a turn's time, **not** an entity ID or part of the chat's declared name; duplicate timestamps may exist. Appending a message never refreshes the name's creation date/time. A message may ask for a human answer or report an answer, as expressed through chat attention state. Accept/save messages immediately and use compatible bounded Git batches; a commit per human-facing message is not required. Task-internal exchanges retain parent result scope.
