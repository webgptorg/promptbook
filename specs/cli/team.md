# TEAM consultation as task-scoped chats

[Main specification](../_main.md) · [TEAM commitment](../book-language/commitments/team.md) · [Chats](chats.md)

TEAM describes, in ordinary language, **whom an agent may consult** and in which circumstances; it is neither inheritance nor a reporting hierarchy. Agent A may consult B and vice versa. A consultation uses the advisor's own instructions but does not create an independent executing task or grant new authority.

A task-scoped **agent↔agent consultation is recorded as a Chat Book** with exactly its two current participants, linked to the originating task. Preserve actual messages and attribution, including consultations with built-in Expert. Such internal messages are **batched into the owning task's single result commit**, not separate Git commits. Evidence remains recoverable while work is incomplete. These internal chats may be inspected in all-chats/related-task views without being confused with requests waiting for the human. Multiple consultations can create separate threads related to one task.

`TEAM @User` instead initiates/continues a durable **agent↔User chat**. Its messages are committed individually and a truly blocking question checkpoints the owning task under [human interactions](user-interactions.md). `TEAM @Expert` uses engine-version expertise; Void/Null is a no-op. All participants are name-resolved under the common precedence; wrong-kind and unresolved names produce diagnostics.

Maintain bounded consultation (initial defaults: five minutes, depth four, 24 calls/task, 128,000 response characters); reaching a limit reports an actual outcome, not recursive hidden work. Advisors cannot exceed task authority. Human waiting does not hold an MCP consultation open through the user's think time.

See [channels](channels.md), [non-agents](../agents/non-agents.md), [traces](traces.md) and [Git persistence](git-persistence.md).
