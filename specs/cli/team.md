# TEAM consultations

[Main specification](../_main.md) · [TEAM commitment](../book-language/commitments/team.md)

TEAM is natural-language instruction about whom an agent may consult, in which circumstances and how to cooperate. It is not a reporting hierarchy. A referenced agent can also work on its own tasks. A may include B while B includes A; reciprocal references are valid.

A consultation uses the advisor's own role and returns its response within the active task. It does not merge the advisor's identity into the requesting agent, claim another queued task or create an independent task commit. The project still has only one active task. Calls happen when requested, not merely because a teammate is listed.

`@User` creates a general human request; `@Expert` uses the running engine's expertise; Void/Null is a valid no-op. Other unresolved or ambiguous references must be visible before they are relied upon. Local and hidden definitions use the same resolver.

Enforce consultation limits, cancellation and accurate usage accounting. Defaults are a five-minute consultation timeout, depth four, 24 calls per task and at most 128,000 response characters. Reaching a limit is an explicit result, not recursion. Advisors cannot acquire authority beyond the task, including in read-only planning.

See [non-agents](../agents/non-agents.md), [user interactions](user-interactions.md), [channels](channels.md) and [harnesses](harnesses.md).
