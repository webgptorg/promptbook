# Core concepts and data contracts

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

An **agent** is a portable role defined by an agent Book: persona, rules, knowledge, inheritance and available advisors. A **project** is the selected directory with materials and configuration; it may be a subdirectory of a larger Git repository. A **task** is a specific work definition with its own state and execution conditions. A **harness** is a tool that gives the agent access to code and a model, such as OpenAI Codex or Claude Code.

A **run** is one coder invocation. An **occurrence** is an individual instance of a task; a one-time task has one logical occurrence, while a recurring task has multiple. An **attempt** is a try within the same occurrence. A **check** is a project validation command. A **trace** is a traceable execution record. A **TEAM consultation** is a query to an advisory agent within a task rather than another concurrent task.

Agent Books and task Books share a readable language and lexical infrastructure. Their document types, meanings and runtimes differ. A task Book must not compile as an agent, automatically inherit Adam or create a chat profile.

## Minimum data contracts

- `TaskDefinition`: ID, title, payload/rules, lifecycle, priority, typed routing, raw+normalized trigger, provenance, source reference/revision.
- `SourceReference`: Format, project and real path, section/commitment location, version, migration origin.
- `ExecutionContext`: Project/Git/worktree paths, agent snapshot, model/harness policy, checks, authority, cancellation.
- `Occurrence`: Task ID, schedule revision, due slot, claim, state, initial snapshot, attempt and result links.
- `PhaseRecord`: Phase, previous/resulting content, owned scope, check outcome, commit intent and commit ID.
- `EligibilityResult`: Ready/waiting/blocked/invalid/unsupported, reason and optional next wake-up.
- `RunResult`: Implementation, validation, local persistence, integration and remote sync as separate outcomes.

**New decision:** internal runtime states include `claimed`, `running`, `checking`, `repairing`, `finalizing`, `completed`, `failed`, `interrupted`, `recovery-required`. These are not additional required `STATUS` values in a task Book; the public lifecycle is their simplified view. `waiting` is an eligibility result rather than a rewrite of `todo`.

## Related specifications

- [Coder architecture](architecture.md)
- [Task Books](task-books.md)
- [Execution lifecycle](execution.md)
- [Task eligibility](eligibility.md)
- [Mutation lease, journal and recovery](recovery.md)
- [Traces and results](traces.md)
