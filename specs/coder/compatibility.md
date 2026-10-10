# Compatibility and deliberate changes

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

## Behavior that must remain compatible

The legacy queue, including implicit tasks, priority and OR routing; all states and manual verify; separation of `fix` from the queue; the selected project/context; default Developer; explicit agent Books and TEAM; the base CLI and supported harnesses; Git scope, phase commits, no-commit, isolation and synchronization; Normal/Raw controls and plain output; use from the installed package.

Neither init nor migration may rewrite the existing Promptbook backlog wholesale as a side effect of installing a new version. Develop the rewrite in a separate package/module with a compatibility test corpus; it may replace the old entry point after verification.

## Deliberate changes for a better implementation

- **A separate domain model rather than a Markdown object throughout the runtime**: Both formats and recurrence use one engine.
- `.promptbook` instead of owned files in `.git`: Required by new PRD 0130; Git itself continues to operate normally.
- **Explicit source revisions and persisted ownership during resume**: Protect user edits and provide actual recovery.
- **Loopback and protected local server mutations**: Preserve a functional UI without adopting the current weak guards.
- **Secret redaction and bounded occurrence history**: Durable diagnostics without accidentally versioning credentials.
- **Safe noninteractive disk failure**: Prohibiting questions does not imply ignoring a critical error automatically.
- **An overview of deferred/blocked tasks in list/dry-run**: New schedules must not disappear from view as an empty queue.

Document every change to a command default, exit code or output format in release notes. **New decision:** the base exit contract is `0` = successful termination according to mode, `1` = execution/check/persistence/sync failure, `2` = invalid configuration/input; cancellation uses `130` for SIGINT. An empty or future-only queue is not an error, but must be described accurately.

## Related specifications

- [Coder scope](scope.md)
- [User and CLI contracts](cli.md)
- [Migrating Markdown tasks to Books](migration.md)
- [Acceptance scenarios](acceptance.md)
- [Implementation stages and Definition of Done](delivery.md)
