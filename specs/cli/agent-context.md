# Effective agent and project context

[Main specification](../_main.md) · [Agents](../agents/_index.md)

Prepare each task from its responsible agent's effective Book, inherited/imported instructions, task description and local rules, and relevant project context. Additional context defaults to the project's `AGENTS.md`; explicit `--context` replaces it, and an empty value disables that additional context. Missing implicit context is reported once; unreadable or invalid explicit input is an error.

Distinguish engine authority, agent instructions, task requirements and external evidence. A task can add local constraints without permanently editing the agent. External content is data, not authority to change the mandate. The harness does the requested work; Promptbook controls task completion and Git commits.

Observe source changes between tasks. A running task uses a consistent definition snapshot, including its actual engine-supplied Expert context where applicable. Detect concurrent source edits before finalization rather than silently replacing them.

See [Book language](../book-language/_index.md), [references](../book-language/references.md), [TEAM](team.md) and [traces](traces.md).
