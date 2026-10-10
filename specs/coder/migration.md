# Migrating Markdown tasks to Books

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

```bash
ptbk coder migrate --path ./project --tasks ./work-items --dry-run
ptbk coder migrate --path ./project --tasks ./work-items
```

Migration is an explicit one-way local operation. It performs no model call, tool installation, checks, implementation, server startup or database migration. Legacy execution must work without migration; one nonblocking tip per invocation may suggest the correct command.

1. Analyze actual task sections through shared adapters and build a conversion plan. One section produces one Book; naming and IDs are deterministic.
2. Preserve payload, title/emoji identification, state, priority, routing OR alternatives, time instant, notes and available history. Recalculate relative references structurally rather than by global replacement in code and URLs.
3. Convert opaque legacy tokens to `RUNNER` and time tokens to `AFTER`; do not guess which token is a model or agent.
4. Convert every section of one source file, reread the new Books and verify equivalence of normalized meaning.
5. Only then remove the original from the active queue into a non-executable archive, preserving original bytes and asset availability. Do not archive the original if any of its sections failed conversion.
6. Persist successful migration in one scoped local commit unless `--no-commit` is set; push is not implicit.

Dry-run must not create a directory, lock/journal, source ID, file or commit; keep proposals in memory. Actual migration must use a mutation lease and recovery transaction with origin metadata/checksums. Refuse a task with a live claim.

After interruption, the two representations must not be independently runnable. The runtime must identify the authoritative representation from migration provenance/the journal; block ambiguous copies. Repeating a completed migration must neither duplicate anything nor commit again. A changed source/destination, ID collision or lossy construct requires explicit resolution rather than overwrite.

Conversion must not activate incomplete, not-ready, failed or in-progress sections. An older coder without Book support cannot execute the new tasks; compatibility cannot also be promised for old binaries. New init/authoring prefers Books while existing custom templates and scripts remain preserved.

## Related specifications

- [Project paths and task sources](workspace.md)
- [Legacy Markdown tasks](task-markdown.md)
- [Task Books](task-books.md)
- [Mutation lease, journal and recovery](recovery.md)
- [Compatibility and deliberate changes](compatibility.md)
