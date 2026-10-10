# Not-before: earliest start

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Markdown recognizes a schedule only as an entire backtick token on the task's own control/status line. Book uses `AFTER`. A date in the title, body, path, example, URL or completed report is not a trigger.

Support a strict grammar: `YYYY-MM-DD`; date and time separated by a space or `T`, time `HH:mm` with optional seconds and fractional seconds; no zone, `Z`, or an offset `+HH:mm`/`-HH:mm`. Accept an offset with the space-separated form as well. Do not claim support for arbitrary ISO variants.

```markdown
[ ] !! `2026-10-30 09:30`
[ ] `gpt` `2026-10-30T09:30:00+01:00`
[ ] `gpt-4.1-2025-04-14` `2026-10-30`
```

A date without time means midnight at the beginning of that day. The boundary is `now >= notBefore`. `Z`/an offset determines the instant; without an offset, use one explicitly resolved local invocation timezone and show it to the user. **New decision:** the default is the system's local IANA timezone, captured once at the start of the invocation; if it cannot be resolved reliably, input without an offset is an error. Store the timezone used when activating the schedule. A nonexistent or ambiguous local time at a DST transition requires an explicit offset.

Invalid dates, ranges or date-shaped typos block the task. A model name containing a date is not a date. Repeated identical instants are redundant; different instants in one definition are a conflict. Relative words, a time alone, cron and natural-language conditions are unsupported.

A future high-priority task does not block eligible tasks. A deferred task remains `todo`. `run` exits when no eligible work remains and reports future tasks/the next relevant time. A persistent scheduler wakes on source changes or time. Neither `S` nor pause/resume bypasses this condition. Restoring an already-started task is recovery rather than a new scheduled start.

## Related specifications

- [Task eligibility](eligibility.md)
- [Recurring task Books](recurrence.md)
- [Terminal and run controls](terminal.md)
