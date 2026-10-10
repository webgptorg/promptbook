# Learning from completed work

[Agents](_index.md) · [Task lifecycle](../cli/execution.md)

Learning improves a maintained agent definition; it does not require training model weights. Each agent Book is open to learning unless its own final commitment says `CLOSED`. Explicit `OPEN` may be empty or carry natural-language limits, such as learning new knowledge without changing rules.

When an open project/core agent completes a task, create a follow-up task assigned to Teacher. Save it with the original task's result and completion in that same commit. The learning task identifies the agent and completed work, and follows that work in the shared queue. It is neither an invisible background edit nor a second kind of runner.

Teacher reviews the evidence actually available: outputs, checks, actions, mistakes, corrections and diagnostic/reasoning material exposed by the harness. Unavailable private reasoning must not be invented. Persist useful learning in the allowed parts of the agent's Book, with the teaching task's own checked completion commit.

A closed agent receives no automatic teaching changes. Recheck the current learning policy before applying an update; closing an agent also protects it from an already queued learning task. OPEN does not authorize changing its own limits, expanding tool permissions or weakening project safeguards. An inherited instruction's origin must remain distinguishable from the local definition being taught.

Non-agents have no editable project source to teach. Teacher itself must be closed. Deduplicate follow-ups and preserve their relationship across retries/restart. See [consistency](consistency.md) and [traces](../cli/traces.md).
