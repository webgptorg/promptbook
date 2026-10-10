# Where tasks originate

[Main specification](../_main.md)

Tasks have three useful origins, not three incompatible runtime types:

- **Explicit work:** supplied by a person or another source as a project task.
- **Derived work:** created because of another task, such as Manager assignment, Teacher learning, repair or further research.
- **Goal-driven work:** discovered by asking project agents what useful work follows from their goals when there is no outstanding work.

The engine may materialize a task automatically; a model need not have authored the request. All these tasks have the same source, relationship, scheduling, check, completion and commit semantics. Their origin is traceable metadata, not an exemption from controls.

Finishing a task can create additional tasks. Commit those definitions together with the completed task and its result, then select the next eligible work. An open agent's teaching follow-up is one such generated task. Assignment work precedes its target rather than executing invisibly inside it.

Explicit user work will often have higher priority, but provenance alone does not impose a universal ranking. Dependencies and declared priority govern execution; automatic goal discovery is always the lowest-priority source.

See [goal discovery](goal-discovery.md), [learning](../agents/learning.md) and [execution](execution.md).
