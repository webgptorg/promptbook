# Progressive Book layering

[Book language](_index.md) · [Syntax](syntax.md) · [Chats](../cli/chats.md) · [Storage and Git](../cli/storage-and-git.md)

A Book grows as instructions, knowledge, decisions and events are added. Its ordered commitments are layers describing one evolving entity. This makes a Book understandable as both current context and the history needed to interpret that context.

Layering is not a universal append-only restriction. An authorized edit may revise an agent's instructions, replace a resolved MODEL or correct task content under that commitment's contract and normal Git provenance. Parsing and each commitment's semantics decide whether repeated values accumulate, replace an effective value or are invalid. Do not introduce a second parser or universal last-value-wins rule.

## Chat chronology

Chat events are chronological additions. A newly created chat is implicitly `open`; do not emit an initial `CHAT STATUS open` merely to spell the default.

When the actual state changes, append a new `CHAT STATUS open|waiting-for-user|resolved` at that point in the Book. The last valid nonliteral status commitment defines the current state; absence means open. Preserve previous status commitments instead of rewriting the old line, and do not append another identical status for a read or no-op.

Append a new participant's `CHAT MEMBER` before that participant's first message, where the join actually happened. Do not move every later participant into the initial membership block. Likewise append `CHAT TITLE` changes at the time of the change, preserving prior titles. New messages retain actual author, timestamp and order.

```book
CHAT Review export
CHAT MEMBER @User
CHAT MEMBER @Chatter
CHAT MESSAGE @User 2026-10-28T13:00:00+01:00
Please review the export.
CHAT MEMBER @Developer
CHAT MESSAGE @Developer 2026-10-28T13:01:00+01:00
Which column order should be preserved?
CHAT STATUS waiting-for-user
CHAT MESSAGE @User 2026-10-28T13:02:00+01:00
Keep the current order.
CHAT STATUS open
CHAT TITLE Preserve export column order
```

Status describes actual outstanding questions/actions; a new message or merely viewing a chat does not automatically answer every wait. Saved responses clear their own question promptly. Snapshot readers, editing, restart and Git batching must preserve the same effective state and source chronology.

Root [`report.book`](../cli/project-report.md) preserves every new brief as another Chatter message. Dashboard/status read the latest complete message; no overwriting or required compaction is introduced, even for a very long feed.

## Acceptance outcomes

Create a chat without a status line: it is open. Append waiting, open and resolved transitions around actual messages and recover the last valid state after restart. Join a task agent mid-conversation and change the title: all additions remain at their chronological positions. Literal control-looking message text changes no effective status. Editing an agent instruction remains possible without claiming all Books are immutable event logs.
