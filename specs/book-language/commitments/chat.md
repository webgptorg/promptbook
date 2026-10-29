# CHAT

[Commitments](_index.md) · [Syntax](../syntax.md) · [Chats](../../cli/chats.md)

**Document:** Chat; required first commitment, exactly once.

`CHAT <name>` declares a conversation whose nonempty, single-line declared name is `<name>`. Normalize the name content only, excluding CHAT. The declaration identifies the conversation independently of its path, participants or linked tasks; it does not create an executable task or a separate chat ID.

Subsequent CHAT MEMBER, CHAT TITLE, CHAT MESSAGE, CHAT STATUS and applicable shared commitments build that conversation using the common Book syntax. A new message extends the same Book without another CHAT declaration. References use the full persisted opening name. Appended CHAT TITLE changes presentation, not this global name/ID.

New system-created threads include readable creation date/time under [generated-name policy](../../cli/generated-names.md), including threads started through CLI/UI and agent-originated conversations. Dates are ordinary name text, not mandatory chat syntax or message timestamps. Reopening, replying or recovering retains the existing name. Additional root declarations are invalid.

Root [`report.book`](../../cli/project-report.md) explicitly uses stable `CHAT Report` and only Chatter. This is a creation-policy exception, not new grammar or a self-consultation; appended briefs are normal timestamped messages.
