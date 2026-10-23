# Scoped TEAM consultations

[Main specification](../_main.md) · [TEAM commitment](../book-language/commitments/team.md) · [Chats](chats.md)

TEAM describes in ordinary language whom an agent may consult and when. It is neither inheritance nor a reporting hierarchy. A may consult B and vice versa. An advisor uses its own instructions without creating an independent executing task or gaining authority beyond the originating work/conversation.

## Task-scoped consultation

Record an agent↔agent consultation as a two-participant Chat Book linked to its originating task, including consultations with Expert. Preserve actual messages/authors. Internal messages are batched into that task's single result commit, not separate Git commits. Retain evidence while the task is incomplete. All-chats and related-task views can inspect these histories without confusing them with human-waiting requests. Several separate consultations can belong to one task.

## Conversation-scoped consultation

[Chatter](../agents/core-agents/chatter.md), or another selected conversational agent, may consult a teammate to answer the user without inventing a queued task. Record a two-agent internal exchange linked to the originating human-facing chat. The user's selected agent remains their speaker; do not silently add specialists as participants in a human group chat or claim their advice as executed work.

When no executing task owns this consultation, persist the bounded exchange as an ordinary scoped authoring operation under [Git persistence](git-persistence.md), never attach it to an unrelated task's result. Human-facing messages still commit individually. Pending/failed persistence remains recoverable and is not reported saved. A request to perform actual specialist work creates ordinary authorized tasks instead of bypassing the queue, checks, pause or task ownership.

## Shared authority and limits

TEAM User initiates/continues an attributed agent↔User chat with individually committed messages. A truly blocking question checkpoints its owning task under [human interactions](user-interactions.md). TEAM Expert uses current engine expertise; Void/Null is a no-op. Resolve every participant through the common resolver; wrong-kind/unresolved names produce diagnostics.

Consultations remain bounded: initial defaults are five minutes, depth four, 24 calls and 128,000 response characters per task or originating bounded chat turn. Reaching limits is a visible outcome, not recursive hidden work. A reciprocal TEAM graph never means unbounded automatic consultation. Human waiting does not hold an MCP call open through think time. Advisors cannot exceed the originator's authority or mutate unrelated task-owned content.

See [channels](channels.md), [non-agents](../agents/non-agents.md), [traces](traces.md) and [Git persistence](git-persistence.md).
