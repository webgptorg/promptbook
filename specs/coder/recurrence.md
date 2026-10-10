# Recurring task Books

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

```book
Weekly model catalog review

TASK
META ID weekly-model-catalog
STATUS todo
AGENT {../agents/developer.book}
AFTER 2026-10-30T09:00:00+01:00
REPEAT every 1 week

PROMPT
Verify changes at supported providers and update the catalog.
Record verified sources and run the project's checks.
```

Support positive integer intervals in seconds, minutes, hours, days and weeks: for example, `30m`, `24h`, `7d`, `1w`, `every 2 weeks`, `PT30M`, `P7D`, `P1W`. One day is exactly 24 hours and a week is seven such days. This contract does not promise calendar months, years or preservation of the same local hour across DST. Reject zero, negative, overflowing and unparseable intervals.

With `AFTER`, that instant is the anchor and first slot. Subsequent slots are `anchor + n × interval`; completion time does not shift the schedule. Without `AFTER`, the first occurrence is immediately eligible at activation, and the anchor is stored once under ownership. A preview before activation shows that the anchor is not stored yet; it must not create it.

The definition remains active with `STATUS todo`, while an individual occurrence may run, succeed or fail. `not-ready` pauses new occurrences, and explicit `done` retires the definition. A successful first occurrence must not permanently complete or archive the definition.

## Slots, restart and downtime

- Occurrence identity derives from task ID, schedule revision and due slot. Retries remain in the same occurrence.
- Store the anchor, normalized schedule revision, last consumed/completed slot, next due time, claim and bounded history with times, outcomes, retries and trace/commit links.
- Renaming a file/title while preserving the ID preserves history. A timezone change after activation does not recalculate stored instants.
- Coalesce missed slots into at most one catch-up occurrence for the latest due slot. Record the coalescing; do not generate a queue for months of downtime.
- One task must not have overlapping occurrences. After completion, a long run is evaluated using the same coalescing policy, without a tight infinite loop.
- A finite `run` may claim at most one occurrence of each recurring definition per invocation. Persistent mode may claim a later slot afterward.
- Exhausted retries or an ambiguous interrupted outcome block automatic subsequent occurrences until explicit recovery/acknowledgement. Do not treat a failure as resolved automatically when a new week arrives.
- On restart, reconcile the claim with the result, journal and Git history first. A failed push or interruption of the final write must not automatically re-execute a completed task.

**New decision for an unspecified PRD detail:** a semantic change to normalized `AFTER`/`REPEAT` creates a new schedule revision. Merely changing `1w` → `7d`, an equivalent offset, whitespace or a name changes neither revision nor anchor. With explicit `AFTER`, the new revision reuses its instant; without it, store the time the new revision is accepted. An already-running occurrence completes its old snapshot; the new revision must not overwrite it and waits for the claim to be released. Show the recalculated due time before the next start.

The base guarantee applies to one shared workspace. It does not guarantee global exactly-once execution across independent clones or reversibility of external side effects.

## Related specifications

- [Task Books](task-books.md)
- [Not-before: earliest start](not-before.md)
- [Task eligibility](eligibility.md)
- [Mutation lease, journal and recovery](recovery.md)
- [Persistent coder server](server.md)
- [Traces and results](traces.md)
