# Requests to the user

[Main specification](../_main.md) · [Unattended operation](autonomous-operation.md)

Human involvement during ongoing execution is exceptional, not the normal way to advance an agenda. Resolve ordinary choices from project/task instructions, established authority and available context; automatically recover from ordinary technical problems. Do not create a request merely to reconfirm an already authorized action, select routine implementation details or compensate for a hidden harness prompt. Attended initialization handles known setup requirements.

When a running agenda genuinely needs a question answered, a decision confirmed or a human-only action performed, use this general mechanism, not only TEAM consultations. Tasks are work for agents; requests are work requiring the human. Do not hide the latter among ordinary task or log entries.

A request identifies its project, originating task ID or system activity, reason, attempted safe resolution, required response and current status. Retain outstanding requests in `.ptbk/` across terminal disconnection and process restart, with corresponding task-linked [trace events](traces.md). Show whether a task is waiting for a reply, confirmation or browser action. Do not fabricate an answer or interpret silence as approval. Deduplicate repeated reports of the same unresolved condition and notify through the configured channels without needing a dashboard open.

## Attention and action

Unresolved actionable requests are the most prominent content in the terminal and browser dashboards and in a [status snapshot](status-view.md). Use a persistent, clearly labeled attention area visible in the initial viewport without opening a tab, expanding a panel or scrolling through logs. Show the pending count, the most relevant request, why it needs the user, affected work and a direct way to answer or perform the action. A badge, small icon, transient toast or colored log line alone is insufficient.

With several requests, surface requests blocking current work first and make every remaining request reachable, retaining the count and attention indicator. Use clear text, hierarchy and contrast, not color or animation alone. On narrow screens, keep the attention summary and response action visible before secondary statistics or connection details.

Provide a discoverable keyboard action in the terminal and a clearly labeled action in the browser, using the shared input controls. A new request becomes conspicuous without stealing focus, discarding a draft or letting a keystroke intended for another control approve it. Opening, viewing or leaving a request is not resolution. Keep it prominent until an answer/action is applied, or its cancellation/expiry is explicitly recorded; synchronize that change across channels. Raw output announces pending requests with their reference, reason and `ptbk answer` guidance rather than silently waiting.

## Request semantics

`TEAM @User` creates a conversational request. Initialization, missing access, recovery or another runtime condition can create requests independently of TEAM. Requests needed for safety or setup do not require adding User to an agent's team. The availability of this mechanism is not an instruction for agents to ask routine questions.

A valid reply is applied once to the request that asked it. Answering in one channel resolves it in all channels; late or conflicting answers must be identified. Cancellation, rejection and inability to respond remain distinct from approval. Only affected work waits. Checkpoint and release its ownership when safe, allowing independent work with at most one executing project task. A shared-workspace or resource conflict that prevents safe switching is an explicit project-wide blocker, not a hidden consequence of every unanswered question.

For engine-managed tasks, TEAM User requests return their durable pending reference promptly; human think time must not hold an MCP consultation open until a provider's tool timeout. The primary agent finishes that turn with unmet acceptance, and the engine checkpoints the same task/occurrence as awaiting User. Do not call that task's model again, consume repairs, count failure or create another recovery request while it waits. A finite command reports the pending request and returns an incomplete outcome. Only a real reply allows continuation of work needing it, with the question, answer and prior effects preserved in context. Do not fabricate completion to keep the queue moving. Direct conversations without an engine task checkpoint retain their conversational reply handling.

Stopping/restarting while awaiting a reply retains that checkpoint and the same request, without repeating the question or provider turn. Resume restores the wait and owned work before making a new call. Replies already consumed inside a provider turn must not trigger duplicate continuation. After resolution, resume eligible work automatically at a safe boundary without requiring another Start/Run action; checks and normal completion remain mandatory.

When a request declares predefined answers, interactive terminal and page presentations expose selectable options under the shared [choice-control contract](interactive-ui.md#predefined-choices). The user can answer without typing an option label or identifier. Open-ended requests retain the [rich composer](rich-input.md); unattended CLI/API answers supply explicit response values.

Declared answers must be unique, readable, nonempty strings: at most 50 answers, each at most 1000 characters. Whitespace or terminal controls alone do not form a readable answer. Validate these constraints when creating a request and reading its persisted record; preserve declared values without trimming or silently merging duplicates. An absent or empty answer list denotes an open-ended request.

## Acceptance outcomes

Create a genuine blocking request while the user is viewing ordinary activity and while editing another field. The request becomes the primary visible attention item in terminal, browser and subsequent status snapshots, without lost input or accidental approval. Multiple pending requests retain their count and remain reachable after refresh/reconnect. Resolving one in another channel updates attention everywhere without hiding the remaining requests; raw output provides an actionable notice.

Repeat a previously authorized publishing action: no redundant approval request appears. With one safely checkpointed human wait and another independent eligible task, the latter can progress without concurrent mutation or false completion of the former. If safe switching is impossible, show the actual shared blocker.

The delivery channel is separate from the request's origin and meaning. See [channels](channels.md), [TEAM](team.md) and [browser interaction](browser.md).
