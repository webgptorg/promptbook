# Operational quality

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Parsing, list, dry-run and migration must work offline. Model execution may require a network according to the harness rather than task format. An empty queue or waiting for a future time must not call a model. Persistent mode must use bounded waits resilient to timer limits, clock jumps and source changes.

Preserve transparent shell-command semantics for the user-selected check. Pass other subprocess arguments as argv or escape them safely for the specific shell; never interpolate paths, model responses or task text as uncontrolled shell code. Process-tree termination must have a platform adapter.

Every error must include the phase, task/project identity, what was preserved and a recommended next step. Distinguish invalid input, missing capability, auth, check failure, timeout, canceled, persistence and remote sync. `--no-questions` must not hang on a hidden prompt; actions requiring a real decision must exit with concrete instructions.

The historical unfinished PRD for `--min-remaining-limit` and its time windows is not a completed feature. The base version preserves display of known quota and correct behavior on exhaustion, but new automatic threshold-based model/provider switching is deferred. An unknown quota must not be interpreted as zero or as an unlimited account.

## Related specifications

- [Coding harnesses](harnesses.md)
- [Attempts, retries and provider limits](retries.md)
- [Persistent coder server](server.md)
- [Traces and results](traces.md)
- [Implementation stages and Definition of Done](delivery.md)
