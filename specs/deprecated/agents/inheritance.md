# Agent inheritance (historical)

> Historical specification retained from the older Agents Server specs. It has lower authority, especially for implementation details; see the [archive policy](../_index.md).

[Historical index](../_index.md) · [Dictionary](../../dictionary.md)

## `FROM` — inheritance

-   At most **one effective `FROM`** applies: the *last* single-line `FROM <reference>` in the source wins (lightweight parsing skips fenced code blocks; multiple materialized `FROM` lines in one source are an error).
-   `FROM VOID` (or a blank `FROM`) → **no parent**; the source stands alone.
-   No `FROM` at all → **implicit ancestor**: the well-known **Adam** agent (see below), unless the agent being resolved *is* Adam itself.
-   The parent reference is resolved (compact → URL) and the parent's source is imported. The parent's **corpus** — its source minus the title line and any trailing `OPEN`/`CLOSED` status — is embedded into the child as a NOTE-delimited block:

```book
NOTE Inherited FROM https://server/agents/parent
<parent corpus>

NOTE ===========
```

-   With an explicit `FROM`, the block replaces the `FROM` line in place. With the implicit ancestor, the block is inserted right after the title line.
-   When the parent cannot be loaded, a NOTE line documents the skipped inheritance instead (resolution still succeeds).
-   Inheritance is **recursive** — the parent's own `FROM`/`IMPORT` chain is resolved when its source is imported.

### The Adam ancestor

**Adam** is the default ancestor of every agent. Default URL: `https://core.ptbk.io/agents/adam`; each server seeds (historical page: `../agents.md#seeding`) its own local Adam in the hidden `.core` folder and resolves the ancestor URL against the local instance (`getWellKnownAgentUrl('ADAM')`), so inheritance works offline. Adam's book carries the baseline persona and rules shared by all agents. Editing the local Adam changes the effective behavior of every agent on the instance that does not opt out via `FROM VOID` or an explicit `FROM`.

## Related historical specifications

- [Agent references](references.md)
- [Source resolution](source-resolution.md)
- [Imports](imports.md)
