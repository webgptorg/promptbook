# Requests to the user

[Main specification](../_main.md)

A running agenda may need a question answered, a decision confirmed or an action performed by its user. This is a general mechanism, not a feature limited to TEAM consultations. Tasks are work for agents; requests are work requiring the human. Do not hide the latter among ordinary task or log entries.

A request identifies its project, originating task or system activity, reason, required response and current status. Retain outstanding requests in `.ptbk/` across terminal disconnection and process restart. Show whether a task is waiting for a reply, confirmation or browser action. Do not fabricate an answer or interpret silence as approval.

## Attention and action

Unresolved actionable requests are the most prominent content in the terminal and browser dashboards and in a [status snapshot](status-view.md). Use a persistent, clearly labeled attention area visible in the initial viewport without opening a tab, expanding a panel or scrolling through logs. Show the pending count, the most relevant request, why it needs the user, affected work and a direct way to answer or perform the action. A badge, small icon, transient toast or colored log line alone is insufficient.

With several requests, surface requests blocking current work first and make every remaining request reachable, retaining the count and attention indicator. Use clear text, hierarchy and contrast, not color or animation alone. On narrow screens, keep the attention summary and response action visible before secondary statistics or connection details.

Provide a discoverable keyboard action in the terminal and a clearly labeled action in the browser, using the shared input controls. A new request becomes conspicuous without stealing focus, discarding a draft or letting a keystroke intended for another control approve it. Opening, viewing or leaving a request is not resolution. Keep it prominent until an answer/action is applied, or its cancellation/expiry is explicitly recorded; synchronize that change across channels. Raw output announces pending requests with their reference, reason and `ptbk answer` guidance rather than silently waiting.

## Request semantics

`TEAM @User` creates a conversational request. Initialization, missing access, recovery or another runtime condition can create requests independently of TEAM. Requests needed for safety or setup do not require adding User to an agent's team.

A valid reply is applied once to the request that asked it. Answering in one channel resolves it in all channels; late or conflicting answers must be identified. Cancellation, rejection and inability to respond remain distinct from approval. Only affected work waits, subject to the rule that there is at most one active project task.

For engine-managed tasks, TEAM User requests return their durable pending reference promptly; human think time must not hold an MCP consultation open until a provider's tool timeout. The primary agent finishes that turn with unmet acceptance, and the engine checkpoints the same task/occurrence as awaiting User. Ongoing supervision waits without another model call, repair attempt, failed-task count or recovery request. A finite command reports the pending request and returns an incomplete outcome. Only a real reply allows continuation, with the question, answer and prior effects preserved in context. Do not fabricate completion to keep the queue moving. Direct conversations without an engine task checkpoint retain their conversational reply handling.

Stopping/restarting while awaiting a reply retains that checkpoint and the same request, without repeating the question or provider turn. Resume restores the wait and owned work before making a new call. Replies already consumed inside a provider turn must not trigger duplicate continuation. After the confirmed task passes normal checks/completion, the service continues to the next eligible task automatically.

When a request declares predefined answers, interactive terminal and page presentations expose selectable options under the shared [choice-control contract](interactive-ui.md#predefined-choices). The user can answer without typing an option label or identifier. Open-ended requests retain the text composer; unattended CLI/API answers continue to supply explicit response values.

Declared answers must be unique, readable, nonempty strings: at most 50 answers, each at most 1000 characters. Whitespace or terminal controls alone do not form a readable answer. Validate these constraints when creating a request and reading its persisted record; preserve declared values without trimming or silently merging duplicates. An absent or empty answer list denotes an open-ended request.

## Acceptance outcomes

Create a blocking request while the user is viewing ordinary activity and while editing another field. The request becomes the primary visible attention item in terminal, browser and subsequent status snapshots, without lost input or accidental approval. Multiple pending requests retain their count and remain reachable after refresh/reconnect. Resolving one in another channel updates attention everywhere without hiding the remaining requests; raw output provides an actionable notice.

The choice of delivery channel is separate from both the request's origin and its meaning. See [channels](channels.md), [TEAM](team.md) and [browser interaction](browser.md).
