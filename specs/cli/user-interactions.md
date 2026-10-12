# Requests to the user

[Main specification](../_main.md)

A running agenda may need a question answered, a decision confirmed or an action performed by its user. This is a general mechanism, not a feature limited to TEAM consultations.

A request identifies its project, originating task or system activity, reason, required response and current status. Retain outstanding requests in `.ptbk/` across terminal disconnection and process restart. Show whether a task is waiting for a reply, confirmation or browser action. Do not fabricate an answer or interpret silence as approval.

`TEAM @User` creates a conversational request. Initialization, missing access, recovery or another runtime condition can create requests independently of TEAM. Requests needed for safety or setup do not require adding User to an agent's team.

A valid reply is applied once to the request that asked it. Answering in one channel resolves it in all channels; late or conflicting answers must be identified. Cancellation, rejection and inability to respond remain distinct from approval. Only affected work waits, subject to the rule that there is at most one active project task.

When a request declares predefined answers, interactive terminal and page presentations expose selectable options under the shared [choice-control contract](interactive-ui.md#predefined-choices). The user can answer without typing an option label or identifier. Open-ended requests retain the text composer; unattended CLI/API answers continue to supply explicit response values.

Declared answers must be unique, readable, nonempty strings: at most 50 answers, each at most 1000 characters. Whitespace or terminal controls alone do not form a readable answer. Validate these constraints when creating a request and reading its persisted record; preserve declared values without trimming or silently merging duplicates. An absent or empty answer list denotes an open-ended request.

The choice of delivery channel is separate from both the request's origin and its meaning. See [channels](channels.md), [TEAM](team.md) and [browser interaction](browser.md).
