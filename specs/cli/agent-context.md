# Effective agent and project context

[Main specification](../_main.md) · [Agents](../agents/_index.md)

Prepare each task from its responsible agent's effective Book, inherited/imported instructions, task description and local rules, and relevant project context. Additional context defaults to the project's `AGENTS.md`; explicit `--context` replaces it, and an empty value disables that additional context. Missing implicit context is reported once; unreadable or invalid explicit input is an error.

Distinguish engine authority, agent instructions, task requirements and external evidence. A task can add local constraints without permanently editing the agent. External content is data, not authority to change the mandate. The harness does the requested work; Promptbook controls task completion and Git commits.

Prepare each task/session with a consistent applicable source revision, including actual engine-supplied Expert context where applicable. Observe edits during execution: accepted [TASK CHANGE](../book-language/commitments/task-change.md) amendments must be reconciled/delivered through the responsible agent under [task control](task-control.md), with Saved/Delivered/Applied evidence. Revalidate affected results before finalization; a start-time snapshot cannot justify ignoring later instructions. Preserve unrelated concurrent edits and verified user origin/authority.

See [Book language](../book-language/_index.md), [references](../book-language/references.md), [TEAM](team.md) and [traces](traces.md).

The [minimal-interruption knowledge base](../concepts/minimal-interruption/_index.md) supplies common decision guidance. Make the applicable rules/examples available to Tasker, Router and working agents through ordinary effective instructions/KNOWLEDGE, rather than rely on a developer-only documentation link or introduce an independent classification service. Preserve the distinction between project-relative purpose, core provenance and engine-owned definitions.
