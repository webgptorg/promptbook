# Self-learning

Agents whose book is **open** learn from their conversations: after a turn, the executing agent may append new content to its own source (samples of the exchange, teacher-suggested commitments). The server persists these changes **append-only**, so learning can never rewrite or corrupt the authored book.

## Open vs. closed books

-   `OPEN` — the agent may be modified by conversation. **This is the default** when neither keyword is present. Content after `OPEN` is passed to the Teacher as extra instructions ("teacher instructions").
-   `CLOSED` — locks the book; the compiled requirements carry `isClosed = true` and the engine MUST skip all self-learning for the turn.

## Learning flow (per turn)

1. The engine executes the turn; when the book is open it runs the self-learning workflow:
    - append the recent user/agent exchange as a `SAMPLE` section to the in-memory source;
    - when a **Teacher agent** is configured, consult it (below) and apply its suggested source additions.
2. The server compares sources after the turn (`resolveAppendOnlySelfLearningAgentSource`):
    - compute the delta between the **resolved** source before and after learning;
    - persist only when the change is a pure **append** (after-source starts with before-source; anything else is discarded as unsafe);
    - the appended section is added to the stored **unresolved** child source — inherited/imported content materialized in the resolved source is never copied into the stored book;
    - skip when the appended section is already present (idempotency).
3. The write goes through the normal [agent update path](../agents.md#editing) — history entry, hash recomputation, [preparation](preparation-and-caching.md) scheduling.

### When learning is skipped

Persistence MUST be skipped when any of these hold:

-   the book is `CLOSED` (engine-level skip),
-   [private mode](../chats.md#private-mode) is enabled for the request,
-   the executing agent is a [book-scoped sub-agent](inheritance-and-imports.md#book-scoped-references) (no own row to write to),
-   the change is not append-only or is empty.

Users can additionally disable self-learning for their own sessions via the control-panel toggle (shown when the `IS_CONTROL_PANEL_SELF_LEARNING_ENABLED` [metadata key](../configuration.md#control-panel-and-defaults) allows; see [Settings and notifications](../users/settings-and-notifications.md)).

## The Teacher agent

The Teacher is the well-known Book-language expert agent [seeded](../agents.md#seeding) into the hidden `.core` folder of every server. At chat time the server connects to it as a remote agent (`/agents/teacher` on the local server, connection cached per process) and passes it to the engine as `teacherAgent`.

The Teacher receives the interaction (prompt + response) plus any teacher instructions from the `OPEN` commitment and answers with suggested book additions (new `KNOWLEDGE`, `RULE`, `MEMORY`, … commitments). Teacher failures are logged and never fail the user's turn. When the Teacher is unavailable, learning degrades to sample-appending only.

## Guarantees

-   The authored part of a book is immutable under learning — only appends occur, and every applied append is visible in the [source history](../agents.md#editing).
-   Learning writes race-safely: idempotent append checks plus the ordinary update path (hash chain in `prefix_AgentHistory`) keep concurrent turns from duplicating sections.
-   Because persistence works on the unresolved child source, learning composes with [inheritance](inheritance-and-imports.md): a child learns into its own book, never into its parent's.
