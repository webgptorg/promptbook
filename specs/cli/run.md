# Finite queue execution

[Main specification](../_main.md)

`ptbk run` executes the existing eligible queue for this invocation and then exits. It uses one selected agent, harness variant, model and thinking configuration with project/additional context and documented options. Explicit task requirements remain constraints, not silently overridden defaults. A fixed invocation choice does not freeze the tool inventory or credentials at startup: revalidate them before every task and refresh during work under [live tool rules](tool-runtime.md). Eligible same-variant account fallbacks may serve that selected configuration.

Run does not become an indefinite agenda, invent goal-discovery work or invoke Manager to choose its configuration. Follow-ups do not extend it into an unbounded queue. Future tasks remain pending with the next relevant time reported. A recurring definition runs at most once per invocation. Missing tools produce an honest resource wait/incomplete outcome, not false task success; a finite invocation may end with pending work rather than wait forever. This does not redefine a running background service as stopped when tools are missing.

Interactive run uses the shared [runtime dashboard](terminal.md): actual engine version, task/agent/tool, queue, outcomes, waits and errors, not onboarding. It owns finite execution lifetime unlike an attached viewer. Finish with a concise summary and exit. Raw/noninteractive run uses plain output and supplied choices. If HTTP runs, API/browser views expose the same process and end with the finite invocation rather than leaving an unintended persistent service.

Tasks remain sequential with common checks, ownership, completion, learning follow-ups and recovery. A newly added usable tool can serve current work at its next selection. Apply opt-in synchronization attempts before work/commits and publication after commits; remote failure does not rerun or prevent safe local work. Required configuration migrations happen under their separate [commit contract](configuration-migrations.md).

Unsafe state or failed work uses the shared [errors/traces](errors.md) and an accurate unsuccessful/incomplete result. Manual controls, dry-run, filters, limits, isolation and ordinary uncommitted workflows remain supported within their documented compatibility rules.

Use [start](start.md) for continuous operation and automatic selection across project agents and tools. See [CLI](cli.md) and [execution](execution.md).
