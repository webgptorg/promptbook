# Finite queue execution

[Main specification](../_main.md)

`ptbk run` executes an existing series of eligible tasks and then exits. It uses one selected agent, harness, model and thinking level for that invocation, with project/additional context and the documented run options. An explicit task requirement must be compatible with that selection; it is not silently overridden.

It does not become an indefinite agenda, invent goal-discovery work or invoke Manager to choose its own execution configuration. Newly recorded follow-up work does not turn a finite invocation into an unbounded queue. Future tasks remain pending; report the next relevant time instead of waiting indefinitely. A recurring definition runs at most one occurrence per invocation.

Tasks remain sequential and use the common checks, ownership, completion, learning-follow-up and recovery contracts. Run may exit with a clear error for an unsafe working tree or failed operation. Its manual controls, dry-run, filters, limits, isolation and explicitly uncommitted workflows remain useful service features.

Use [start](start.md) for automatic selection across all available agents/harnesses and continuous operation. See [CLI options](cli.md) and [execution](execution.md).
