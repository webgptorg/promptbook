# Finite queue execution

[Main specification](../_main.md)

`ptbk run` executes the existing eligible queue for this invocation and then exits. It uses one selected agent, harness, model and thinking level, with project/additional context and the documented run options. Explicit task requirements must be compatible with that selection; they are not silently overridden.

Run does not become an indefinite agenda, invent goal-discovery work or invoke Manager to choose its configuration. Newly recorded follow-up work does not extend the invocation into an unbounded queue. Future tasks remain pending; report the next relevant time instead of waiting indefinitely. A recurring definition runs at most one occurrence per invocation.

Interactive run uses the same [runtime dashboard](terminal.md) as `ptbk dashboard` and explicit foreground start: running engine version, current agent/task/harness, queue, results, waits and actionable errors. It is an execution view, not init's onboarding wizard. Unlike an attached dashboard client, run owns its finite execution lifetime. On completion, leave a concise final summary and exit. Raw/noninteractive run uses plain output and choices supplied in advance. If HTTP is enabled, its API and browser SPA expose the same process state and end with the finite invocation, not an unintended persistent server.

Tasks remain sequential and use the common checks, ownership, completion, learning-follow-up and recovery contracts. Unsafe state or a failed operation produces the shared [error/trace experience](errors.md) and an accurate unsuccessful outcome when execution cannot continue. Manual controls, dry-run, filters, limits, isolation and explicitly uncommitted workflows remain useful service features.

Use [start](start.md) for automatic selection across project agents and enabled harnesses and continuous operation. See [CLI options](cli.md) and [execution](execution.md).
