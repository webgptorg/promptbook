# Chat presentation and entry points

[Chats](chats.md) · [Chatter](../agents/core-agents/chatter.md) · [Terminal dashboard](terminal.md) · [Browser dashboard](dashboard.md)

Chat is a real persistent conversation screen, not a one-off answer box. Show the full saved thread name, participants and actual message authors with stable identity, chronological messages, actionable questions, related work/conversations and a [rich composer](rich-input.md). Show the changing CHAT TITLE prominently while keeping the stable opening name/reference inspectable. Human-facing and internal two-agent histories share these presentation concepts while retaining their distinct participants and persistence scope.

## Chatter-first new-chat entry

`ptbk chat` starts a new conversation from the selected project without attaching a dashboard or first opening the chat list. Before the first message, a request without an explicit agent presents exactly two choices:

1. **Chat with Chatter** — the initially focused/default choice. Enter proceeds directly with Chatter, with no second agent picker.
2. **Choose another agent** — opens the complete available target-agent list, including ordinary specialists, hidden/core roles and Expert. Provide bounded scrolling/search and a way back, but no extra hidden-core gate is required to see the valid alternatives.

The picker uses ordinary name resolution and valid-speaker rules. User cannot chat with itself; Void/Null are not speakers. Show an explicit target as selected and bypass the default picker. Noninteractive new-chat requests without a target use Chatter without an invisible prompt. Missing/invalid Chatter produces an actionable setup/repair diagnostic, not silent specialist substitution or automatic project initialization from the picker.

The same two-choice flow applies to the terminal dashboard's new-chat shortcut and browser new-chat action. This default concerns **new human-led chats only**. Reopening a saved thread or responding to an agent-authored request retains that thread's actual agent; Fixer's question must not become a Chatter conversation.

Generate a readable thread name with creation date/time and normalized collision checks under [generated-name policy](generated-names.md), including when the user supplies its descriptive title. No routine name-confirmation gate is added. New chats remain separate even with the same agent. Reopen an existing chat by its full normalized name through an explicit selection/option without allocating another name/date.

## Lifetime, navigation and attention

Ctrl+C closes the chat client/view, not the background engine or durable conversation. Opening chat does not create a task, start another engine or acquire its lock. Chatter and explicit specialists can clarify intent, advise and later create ordinary authorized tasks through the shared machinery.

Retain discoverable C for dashboard new chat, A for the highest-priority existing waiting conversation and access to all chats. A opens the complete authored discussion, not an isolated answer field. Attribute agent-originated messages to their actual speaker. Internal advice may remain a linked two-agent exchange. Task agents visibly join the human-facing thread as participants/actual authors without changing the main agent. Browser controls provide equivalent entry, all-chats, resume, reply and related-work navigation.

Unread is not necessarily actionable and actionable is not necessarily unread. Distinguish new messages, waiting approvals/questions and unrelated notifications. New arrivals never steal focus or submit drafts. Narrow views retain thread identity, speaker, required action and composer; truncation must allow full-name inspection/copying. Predefined responses use shared choice controls; freeform replies use the rich composer. Reading does not resolve a request; an accepted/saved response immediately clears that question's attention before model processing/Git batching.

`ptbk ask` may remain a quick-question/task-submission entry, not a second anonymous request model. `ptbk add` remains explicit finite authoring. Status/show exposes attention without opening a client; raw/noninteractive output never prompts invisibly.

## Progress, input and task cards

Show in-progress reply text and available progress during work and keep the composer usable for additional instructions. Do not wait for the final reply or freeze other chats. Clients share ordered messages/task state while retaining their own drafts, focus, scroll and expanded presentation.

After the final reply, automatically collapse interim material into **Thinking** plus elapsed duration, without a message count or repeated interim text by default. It can be expanded; the complete actual conversation remains in the Book. Measure real elapsed time and do not invent provider thinking content.

Show live task boxes/cards under [chat/task relationships](chat-tasks.md): readable task name, actual state and normal detail navigation. Reflect starts/waits/outcomes while keeping chat usable; append the concise completion result. Questions identify actual agent/task and share one answer/state with task detail.

## Acceptance outcomes

Run direct chat and press Enter: reach Chatter immediately. Repeat from dashboard/browser. Choose another agent and reach ordinary, hidden/core and Expert targets; explicit agent input bypasses the first picker. Verify excluded non-speakers and missing Chatter diagnostics. Ask status without creating a task, then create authorized linked work. Open two same-agent threads with repeated titles/same clock tick, preserve separate histories and reopen without renaming. A opens another agent's original waiting thread; replying resumes linked work once. Closing chat leaves the engine alive and messages, drafts/read markers and identity intact across refresh/reconnect.

The separate Chats panel uses the same Chatter-first picker. The Tasks panel instead promotes a direct Tasker conversation for task creation/management. Chat uses the shared rich editor; its first-message MODEL chronology and availability during busy work/pause follow [chats](chats.md), without launching queued tasks under pause.
