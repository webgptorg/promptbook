# Agent imports (historical)

> Historical specification retained from the older Agents Server specs. It has lower authority, especially for implementation details; see the [archive policy](../_index.md).

[Historical index](../_index.md) · [Dictionary](../../dictionary.md)

## `IMPORT` — textual inclusion

Each `IMPORT <reference>` line is processed independently, in place:

-   Reference resolved compactly; a non-URL, non-agent value (e.g. a file path the server does not recognize) leaves the line untouched.
-   An agent URL is imported and embedded as `NOTE Imported from <url>` + corpus + `NOTE ===========` (same corpus rules as `FROM`).
-   Multiple `IMPORT`s are allowed; failures produce NOTE fallbacks per reference.

## Import mechanics (shared by `FROM` and `IMPORT`)

1. **Same-instance short-circuit** — an optional local importer resolves URLs that point to agents of the same server directly from the database (no HTTP round-trip).
2. **HTTP import with fallback** — other URLs are fetched from the owning (possibly [federated](federation.md)) server with bounded retries (`maxAttempts`, `retryDelayMs` from the federated import configuration (historical page: `../configuration.md#server-limits`)). Concurrent imports of the same URL are deduplicated in flight.
3. **Missing-agent fallback book** — when all attempts fail, the importer returns a generated placeholder book (`Not found agent` + NOTE with URL, attempt count, reason + `CLOSED`) and caches this negative result for 60 s, so an unavailable remote agent cannot stall every navigation.
4. **Cycle detection** — the resolution stack tracks visited agent URLs (including aliases of the current agent). A `FROM`/`IMPORT` edge to an already-visited URL MUST fail resolution with a diagnostic listing the cycle chain.

## Related historical specifications

- [Agent references](references.md)
- [Source resolution](source-resolution.md)
- [Inheritance](inheritance.md)
- [Federation](federation.md)
