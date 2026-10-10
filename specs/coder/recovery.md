# Mutation lease, journal and recovery

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

One writing owner coordinates agent changes, checks, status writers, source migration, the index, integration and Git operations in the affected checkout. A live worker blocks a second invocation. A stale lock must not be automatically taken over based only on age.

**New decision:** store workspace/run/worktree identity, a random ownership token, PID/host and heartbeat in `.promptbook/ptbk-coder`; critical decisions must not rely on PID alone. Related worktrees/nested projects must share coordination for operations affecting the same Git index or integration branch. Resolve the location of shared coordination through explicit workspace context rather than writes to `.git`.

The journal records the phase boundary, source hash, baseline and resulting content/index snapshots, expected HEAD, task/occurrence identity, commit creation intent and any commit already found. Writes are atomic and versioned; diagnose corrupted state rather than reset it to empty. On restart, reconcile with history first, then offer a precise safe continuation step.

**New decision — controllable recovery:** add `ptbk coder recover <task-id>` as a read-only overview of a selected interrupted/blocked occurrence. Specify a mutating action explicitly with `--action resume`, `retry` or `acknowledge`, and `--occurrence <id>` when needed. `resume` continues only a proven unfinished phase; `retry` deliberately repeats a failed occurrence with the same identity and a new attempt record; `acknowledge` closes the blocking occurrence as an accepted failure rather than success. Recurrence may then continue only with a newer due slot. Ambiguous external effects require specific confirmation included in the recovery plan; the command never establishes ownership over unproven bytes. `--dry-run` prints the plan without writes, and all actions are subject to leases/revisions. This is a new explicit UX contract rather than an existing command in the analyzed coder.

## Related specifications

- [Core concepts and data contracts](domain-model.md)
- [Change ownership and Git persistence](git-persistence.md)
- [Execution lifecycle](execution.md)
- [Recurring task Books](recurrence.md)
- [Migrating Markdown tasks to Books](migration.md)
