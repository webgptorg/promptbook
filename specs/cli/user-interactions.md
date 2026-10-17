# Human-directed conversations and exceptional decisions

[Chats](chats.md) · [Unattended operation](autonomous-operation.md) · [Chat presentation](chat-ui.md)

Every actual question, decision, browser login/2FA request or human-only action from the running system is represented as **a message from a concrete agent in a durable chat with @User**. It is **not** a second project entity called Request, an anonymous engine alert or a hidden form; it uses the same Book messages, history, Git commits and interfaces as a user-initiated chat. TEAM @User, startup/access problems and exceptional recovery conditions can all initiate or continue an appropriate agent→User conversation. The agent author and affected task/project condition must be explicit.

Human involvement must remain exceptional. Use authorized project context, ordinary task instructions and bounded automatic recovery rather than routine per-action reapproval. Do not start duplicate chats for the same still-unresolved condition, silently presume assent, or claim answering one question cures an unchecked technical prerequisite. A chat can contain further clarification or explanation before the human makes the required decision.

## Attention and state

Waiting-for-user chats are the **highest-priority** dashboard attention content, with pending count, affected work, agent author, reason and a direct open-chat action visible without scrolling. Unread chats are also shown distinctly, but unread alone does not mean blocked. List **all chats** through an explicit view; no special Fixer category or separate request pane is necessary. Narrow screens retain actionable content above routine queue, QR and activity. Opening/read markers never resolve the underlying condition or commit a synthetic answer.

Status snapshots and raw output give a usable chat name/ref and `ptbk chat` / `ptbk answer` guidance without waiting on stdin. Terminal `A` opens the relevant existing conversation; browser and authenticated API use the same messages and action state. Live updates do not steal focus or discard drafts. Each answer becomes a single committed user chat message, with once-only semantics across clients.

## Waiting tasks and recovery

When a task requires actual human assistance, store a task↔chat reference and its durable checkpoint, including the exact question, offered options, prior authorized effects and resume point. Return from the provider turn promptly; human waiting must not tie up an MCP call until timeout. The task remains unfinished without counting a failure or launching duplicate provider turns. Safe independent work may proceed only after releasing ownership; shared resource conflicts are explicitly reported. A finite run may return incomplete with the waiting chat.

Only a real applicable reply or completed human action permits continuation. Reject stale/double answers, distinguish reject/cancel/unavailable from approve, and validate the state of required external access after a claimed login. After restart, retain the same chat and checkpoint; answering through any channel is reflected in all channels, and the original task resumes automatically when safe. A task must still pass its normal checks before completion. Do not assume a message is an approval merely because it exists.

When an agent provides predefined answer choices, terminal/browser render them as selectable controls. Values are unique nonempty human-readable strings, at most 50 options of at most 1000 characters each; reject malformed duplicate/whitespace-only choices instead of trimming or silently merging. Open-ended prompts use the rich composer; noninteractive API/CLI uses explicit response values. Chat history and message semantics must preserve these choices, without turning choice labels into entity IDs.

## Compatibility and acceptance

Upgrade old pending request records into durable chats without losing evidence, agent origin or wait status, and without repeated questions on restart. `ptbk answer` remains an alias/compatibility path to the selected waiting chat, not a parallel mutable request store. An answered chat no longer appears as awaiting attention, but remains browsable with history and task relationships.

Exercise multiple waiting chats, a multi-turn clarification, reconnect and process restart, stale/double answers, rejected decisions and a task safely releasing/reclaiming execution. Each actual human-facing message is committed separately and attributed to its sender. A task with an agent↔agent TEAM consultation retains that internal conversation in its task result commit, not in human attention.
