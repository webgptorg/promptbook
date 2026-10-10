# Traces and results

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Every occurrence has a traceable run/attempt/phase record: task and source snapshot, agent/harness/model/thinking, start/end, actual outcome, check command and result, usage/cost with estimates labeled, commit IDs, retry reasons, any integration/sync error and diagnostic links.

Preserve legacy trace paths and section suffixes; new recurrence history must not lose older occurrence identities by overwriting the latest log. A runtime log may remain temporary, but successful finalization must preserve the required durable trace before cleanup. Do not report a push merely because a local commit exists.

**New decision:** redact known credentials/secret environment values before persistence and display. Raw means unstructured provider output rather than permission to publish secrets. The audit trail records that redaction occurred; logging must not copy `.env` into Git history. Limits and retention must be documented.

Provide concrete diagnostics for critically low disk space. The new implementation must not interpret `--no-questions` as an obligation to continue unsafe writes: the **new decision** is safe noninteractive exit/recovery rather than endless waiting or false success.

## Related specifications

- [Core concepts and data contracts](domain-model.md)
- [Execution lifecycle](execution.md)
- [Recurring task Books](recurrence.md)
- [Git synchronization](git-synchronization.md)
- [Operational quality](operations.md)
