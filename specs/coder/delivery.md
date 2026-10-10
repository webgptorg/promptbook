# Implementation stages and Definition of Done

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

| Stage | Deliverable | Gate |
| --- | --- | --- |
| 1. Contracts and skeleton | Domain types, a fixture corpus of existing behavior, workspace/configuration, CLI shell | Read-only and path/Book precedence scenarios. |
| 2. Functional legacy coder | One task engine, Markdown adapter, harness boundary, Git scope, checks/fix, recovery, traces | E01-E18 and legacy T/U scenarios. |
| 3. Product parity | Init/add/plan/verify, seven harnesses, TEAM, terminal and base server, isolation | Packaged CLI and UI/capability scenarios. |
| 4. Not-before and task Books | Typed annotations, time, Book adapter, `--tasks`, mixed queue, migration | T01-T11 and migration crash/idempotence tests. |
| 5. Recurrence | Trigger/occurrence store, claims, coalescing, persistent wake-ups | T12-T15, restart/concurrency scenarios. |
| 6. Replacement of the old coder | Compatibility report, release notes, removal of superseded runner paths | All required scenarios, without silent loss of commands. |

Stages determine work order rather than permission to omit any required feature from the final delivery. The check/Git contract and ownership must be complete before adding long-term schedules. Deferred directions in the [coder scope](scope.md) have separate future assignments.

**Definition of Done:** the coder can be installed and used outside the Promptbook monorepo; a legacy user can continue without changing the backlog; new task Books, scheduling and recurrence satisfy the behavior described here; no format bypasses shared checks/Git/recovery; CLI and server share an engine; loss or overwriting of someone else's work is a regression blocker. Delivery includes running code, tests, documentation, a compatibility table and a verification record, with a clear list of actually unsupported deferred features.

## Delivered documentation

Delivered documentation includes a quick start, complete CLI help, task/agent distinction, time/interval grammar, a priority/routing table, legacy/mixed/Book project examples, safe migration and downgrade restrictions, checks versus verify, recovery procedure and commit/synchronization policies. Validate examples using the same parser as the runtime. Marketing promises are not evidence of functionality.

## Related specifications

- [Coder scope](scope.md)
- [Coder architecture](architecture.md)
- [Compatibility and deliberate changes](compatibility.md)
- [Acceptance scenarios](acceptance.md)
- [Operational quality](operations.md)
