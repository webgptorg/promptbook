# Coder architecture

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Use TypeScript and explicit dependencies. **New decision:** target Node 22+ at runtime; the repository in the analyzed snapshot declares Node >=18.18 and npm >=8, so raising the minimum is a deliberate change. The production npm package must work in an external fixture project without a Promptbook source checkout and without `ts-node` in the user workflow. Current process adapters require Bash; the new version must either explicitly verify it as a prerequisite or replace it with an equivalent argv/process adapter. Verify macOS/Linux; base Windows support on a concrete process/Git adapter or explicitly documented WSL rather than a vague cross-platform promise.

## Modules and their responsibilities

| Module | Owns | Must not own |
| --- | --- | --- |
| Domain | TaskDefinition, Occurrence, Attempt, outcomes, diagnostics | Filesystem, subprocesses, UI, Git. |
| Source adapters | Markdown/Book parsing, serialization, source revision | Scheduler, harness installation. |
| Eligibility & schedule | Typed routing, time, intervals, due slots | Waiting, Git, model calls. |
| Workspace & configuration | Paths, sources, Book/context selection, effective options | Global `process.chdir`, hidden environment changes. |
| Claim & state store | Lease, occurrence ledger, atomic transitions, recovery | Model decision-making. |
| Execution service | One task's lifecycle, attempts, cancellation | Reading the next backlog task, drawing the UI. |
| Check service | Command setup, isolated snapshot, results, repair feedback | Its own task queue. |
| Git persistence | Ownership, phase deltas, commits/integration/sync | Interpretation of Book syntax. |
| Harness adapters | Provider process, stream, auth/quota/capabilities | Task status rewriting, their own Git commit policy. |
| Supervisor | Finite/persistent policy, selection of further work, wake-ups | Duplication of the execution service. |
| Presentation | CLI help, terminal/server views, commands over services | A second canonical representation of tasks. |

The clock, timezone resolver, filesystem, Git, subprocess launcher, state store and harness must be replaceable by deterministic test doubles. Compile adapters into one dependency graph; orchestration must not import CLI or React. No mutable global current agent, task, cwd or shared cache without a workspace/revision key.

Do not add a general plugin framework or an event bus with dozens of abstractions before there is a real need. Narrow interfaces, one owner per responsibility and testable boundaries matter. SQLite may become a later state-store adapter; the base coder does not require it.

## Related specifications

- [Core concepts and data contracts](domain-model.md)
- [Project paths and task sources](workspace.md)
- [Execution lifecycle](execution.md)
- [Coding harnesses](harnesses.md)
- [Implementation stages and Definition of Done](delivery.md)
