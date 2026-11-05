# Chat presentation and entry points

[Chats](chats.md) · [Chatter](../agents/core-agents/chatter.md) · [Terminal dashboard](terminal.md) · [Browser dashboard](dashboard.md)

Chat is a real persistent conversation screen, not a one-off answer box. Show the full saved thread name, participants and actual message authors with stable identity, chronological messages, actionable questions, related work/conversations and a [rich composer](rich-input.md). Show the changing CHAT TITLE prominently while keeping the stable opening name/reference inspectable. Human-facing and internal two-agent histories share these presentation concepts while retaining their distinct participants and persistence scope.

Standalone `ptbk chat` is a **direct shortcut to the same chat interface used inside the project dashboard**. Share the conversation/controller, rich input, rendering, read/seen operations, task cards, project event observation and [notification/effects policy](notifications.md); the entry/return shell differs, not the chat behavior. Explain this relationship concisely in chat help/context. Do not open another dashboard merely to provide the shared behavior.

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

Unread is not necessarily actionable and actionable is not necessarily unread. Distinguish new messages, unseen explicit User pings and unanswered questions that have already been seen. New arrivals never steal focus or submit drafts. Narrow views retain thread identity, speaker, required action and composer; truncation must allow full-name inspection/copying. Predefined responses use shared choice controls; freeform replies use the rich composer. Actually displaying the calling message during active viewing marks that occurrence seen project-wide and clears its attention, while preserving its pending question/checkpoint. A list, preload or offscreen message does not count. Reading does not resolve a request; an accepted/saved response immediately clears that question's attention before model processing/Git batching.

When a request [resolves automatically](notifications.md#withdraw-obsolete-requests-without-rewriting-history), remove only its pending/attention contribution and show the responsible agent's ordinary explanation in chronology. Keep original messages, active User prefixes and membership visible. Partial resolution shows what remains; other questions stay actionable. Preserve drafts/focus/scroll and accept ordinary late messages. The resolution can be an unread chat message but is not a new human-attention alert.

Keep **Sounds & notifications (experimental)** accessible in both direct and embedded chat without losing the draft or intercepting composer keys. It is the same temporary project-wide switch as the dashboard. The last-used project client owns effects, and this chat continues observing Wallet/Health/system attention outside its thread. Apply ten-second activity suppression and never replay old/suppressed events; ordinary reply-start cues remain subtle rather than desktop alerts. Title/agent visuals use the shared terminal animation scheduler, not an extra chat timer.

`ptbk ask` may remain a quick-question/task-submission entry, not a second anonymous request model. `ptbk add` remains explicit finite authoring. Status/show exposes attention without opening a client; raw/noninteractive output never prompts invisibly.

## Progress, input and task cards

Show in-progress reply text and available progress during work and keep the composer usable for additional instructions. Do not wait for the final reply or freeze other chats. Clients share ordered messages/task state while retaining their own drafts, focus, scroll and expanded presentation.

After the final reply, automatically collapse interim material into **Thinking** plus elapsed duration, without a message count or repeated interim text by default. It can be expanded; the complete actual conversation remains in the Book. Measure real elapsed time and do not invent provider thinking content.

Show live task boxes/cards under [chat/task relationships](chat-tasks.md): readable task name, actual state and normal detail navigation. Reflect starts/waits/outcomes while keeping chat usable; append the concise completion result. Questions identify actual agent/task and share one answer/state with task detail.

Discuss report is an explicit Chatter-targeted new-thread entry. Persist the exact displayed brief as its first Chatter message with source/time provenance; User replies normally. Never reopen the latest Chatter thread by default or add User to the one-agent `report.book` feed. See [report discussions](project-report.md#discuss-a-displayed-snapshot).

## Realtime voice entry

Direct terminal chat, terminal dashboard chat and desktop chat share [voice controls](voice-chat-ui.md). Start voice in the selected thread, preserve typing, drafts and task cards, and show actual call, caption and recording state. The CLI opens a temporary media page. The local desktop app renders the same media and controls inline. Unsupported harnesses and incomplete setup have actionable shared guidance.

## Acceptance outcomes

Run direct chat and press Enter: reach Chatter immediately. Repeat from dashboard/browser. Choose another agent and reach ordinary, hidden/core and Expert targets; explicit agent input bypasses the first picker. Verify excluded non-speakers and missing Chatter diagnostics. Ask status without creating a task, then create authorized linked work. Open two same-agent threads with repeated titles/same clock tick, preserve separate histories and reopen without renaming. A opens another agent's original waiting thread; replying resumes linked work once. Closing chat leaves the engine alive and messages, drafts/read markers and identity intact across refresh/reconnect.

The separate Chats panel uses the same Chatter-first picker. The Tasks panel instead promotes a direct Tasker conversation for task creation/management. Chat uses the shared rich editor; its first-message MODEL chronology and availability during busy work/pause follow [chats](chats.md), without launching queued tasks under pause.
