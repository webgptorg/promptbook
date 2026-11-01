# Teacher

[Agents](../_index.md)

Teacher is an editable core agent supplied with `FROM @Expert` and an explicit final `CLOSED`. The user may customize its teaching instructions or parent, including inheriting a local specialization of Expert. It must remain closed to automatic learning.

Expert inherits the current project's Adam. Teacher therefore transitively receives that Adam's local rules and referenced common knowledge, including the impact methodology, before applying its own teaching instructions. Internal Expert ownership is not a break in project inheritance. See [shared knowledge](../../concepts/common-knowledge.md).

Teacher exists to turn verified completed experience into durable project-agent learning. It executes ordinary learning tasks that improve an eligible agent from completed work. It receives the original assignment, result, available execution evidence, current agent definition and that agent's learning permission. It changes only what that permission allows and must not turn an inference or missing evidence into a learned fact.

A learning result is its own checked task commit, separate from the task that produced the experience. A justified decision to make no change is a valid result. Teacher does not learn from its own teaching task, and its completion does not create another automatic teaching task for itself.

See [learning](../learning.md), [OPEN](../../book-language/commitments/open.md), [CLOSED](../../book-language/commitments/closed.md) and [consistency](../consistency.md).
