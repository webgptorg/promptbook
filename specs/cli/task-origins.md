# Where tasks originate

[Main specification](../_main.md)

Tasks have three useful origins, not three incompatible runtime types:

- **Explicit work:** supplied by a person or another source as a project task.
- **Derived work:** created because of another task, such as Manager assignment, Teacher learning, repair or further research.
- **Goal-driven work:** discovered by asking project agents what useful work follows from their goals when there is no outstanding work.

The engine may materialize a task automatically; a model need not have authored the request. All these tasks have the same source, relationship, scheduling, check, completion and commit semantics. Their origin is traceable metadata, not an exemption from controls.

Every newly materialized task starts with a canonical TASK name declaration and follows [generated-name policy](generated-names.md): readable title plus creation date/time, distinct after normalization. This applies to engine-authored prerequisites/enquiries as well as model-authored work and user-triggered creation. Origin does not create a separate naming namespace. Reusing, migrating or recovering existing work preserves its name instead of generating another task.

Finishing a task can create additional tasks. Commit those definitions together with the completed task and its result, then select the next eligible work. An open agent's teaching follow-up is one such generated task. Assignment work precedes its target rather than executing invisibly inside it. Relationships must use each new task's final persisted name, including disambiguation.

Explicit user work will often have higher priority, but provenance alone does not impose a universal ranking. Dependencies and declared priority govern execution; automatic goal discovery is always the lowest-priority source.

See [goal discovery](goal-discovery.md), [learning](../agents/learning.md) and [execution](execution.md).
