# TASK PURPOSE

[Commitments](_index.md) · [Syntax](../syntax.md) · [Work purpose](../../concepts/minimal-interruption/work-purpose.md) · [Book layering](../layering.md)

**Document:** Task.

`TASK PURPOSE CONTENT`, `TASK PURPOSE SYSTEM` or `TASK PURPOSE UNDEFINED` records the task's purpose relative to the particular project's scope. Missing purpose is also undefined. CONTENT addresses the project's subject/responsibility; SYSTEM is supporting/service work. These are not executor types, core provenance, financial permissions or scheduling priorities.

The author normally supplies a useful classification when creating the task. Tasker, Router or the executing agent may refine it through ordinary authorized maintenance. A changed value is **appended**, preserving earlier commitments in chronological source order; the last valid nonliteral value is effective. UNDEFINED can explicitly remove an earlier classification. Add a concise ordinary note explaining a non-obvious change when useful; no duplicate value on a no-op.

```book
TASK Prepare accounting export - 2026-10-30 09:30:00
GOAL Prepare the agreed export.
TASK PURPOSE CONTENT
TASK NOTE This project only needs this export as internal service infrastructure.
TASK PURPOSE SYSTEM
```

Literal/example content does not change effective metadata. Unknown values use common nonblocking diagnostics, not a second grammar or permission to discard prior valid history. Existing Books remain valid without a new mandatory field or bulk backfill. Purpose changes use normal source ownership, revision checks and scoped Git persistence; preserving Git history alone is insufficient because the Book itself must retain the transition.
