# Agent source resolution (historical)

> Historical specification retained from the older Agents Server specs. It has lower authority, especially for implementation details; see the [archive policy](../_index.md).

[Historical index](../_index.md) · [Dictionary](../../dictionary.md)

How one stored agent source (historical page: `../agents.md#persisted-agent-state`) becomes the **effective (resolved) source** that is actually compiled and executed. Resolution expands `FROM` (inheritance) and `IMPORT` (textual inclusion) commitments, rewrites compact agent references into canonical URLs, and degrades gracefully when references cannot be loaded.

## Terminology

-   **Unresolved source** — the editable child source stored in `prefix_Agent.agentSource`.
-   **Resolved source** — the unresolved source with all `FROM`/`IMPORT` content materialized inline. Everything downstream (profile with inheritance, [model requirements](../agent-compilation.md#two-stage-parsing), chat execution) operates on the resolved source; only the unresolved source is ever written back to the database (see [Self-learning](self-learning.md) for the one exception's mechanics).

## Where resolution happens

Resolution runs in every consumer of the effective source: chat execution (stateless (historical page: `../chat/stateless-chat.md`), durable (historical page: `../chat/user-chats.md`), OpenAI-compatible (historical page: `../api/openai-compatibility.md`)), profile (historical page: `../api/public-agent-api.md#profile`) and system-message rendering, preparation (historical page: `preparation-and-caching.md`), and avatar/manifest generation. Results are cached per agent hash (see Preparation and caching (historical page: `preparation-and-caching.md#runtime-caches`)); the raw stored source is never mutated by resolution.

## Related historical specifications

- [Agent references](references.md)
- [Inheritance](inheritance.md)
- [Imports](imports.md)
- [Self-learning](self-learning.md)
