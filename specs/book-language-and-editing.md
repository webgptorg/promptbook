# Book Language and Editing

Agents are authored in the Promptbook book language. The server stores the source, resolves inheritance/imports, validates edits, exposes source history, and generates model requirements for runtime.

## Book Source

The first meaningful line of an agent source is the agent title. Commitments follow as line-oriented declarations such as:

```book
PERSONA You are a helpful assistant.
RULE Always answer briefly.
KNOWLEDGE The server stores this source as the agent book.
```

Commitments start with a keyword at the beginning of a line and continue until the next commitment or the end of the book.

The server MUST preserve source text as authored except where a book-language operation intentionally transforms it, such as rename, visibility update, padding, validation normalization, import resolution, or generated defaults.

## Commitments

Common commitments include:

- `PERSONA`
- `RULE`
- `KNOWLEDGE`
- `USE BROWSER`
- `USE SEARCH ENGINE`
- `META IMAGE`
- `META DOMAIN`
- `META LINK`
- `META VISIBILITY`
- `TEAM`
- `FROM`
- `CLOSED`

This spec documents server handling of book source. The exact commitment grammar and model-requirement generation are owned by the Promptbook Engine.

## Parsing and Requirements

The server uses two levels of parsing:

- Lightweight parsing for quick profile, name, metadata, and routing decisions.
- Full asynchronous requirement creation for chat runtime.

Full requirement creation applies commitments and may resolve external resources, imports, inheritance, and runtime tools.

## Inheritance and Imports

Agent source can inherit from or import other agents. Resolution MUST support:

- Local agent references by name.
- Local agent references by permanent id where available.
- Book-scoped embedded agents.
- Federated agent references through configured servers.
- The local Adam agent as the implicit parent when no explicit `FROM` is present.
- `{Void}` or `@Void` as an explicit no-parent marker.

Source resolution MUST be recursion-limited to prevent infinite inheritance/import loops.

## Book API

`GET /agents/<agentName>/api/book` returns resolved book source as `text/plain`.

Behavior:

- Authentication is required.
- Query parameters MAY include `recursionLevel` and repeated `resolutionPath`.
- Requests beyond the maximum recursion level MUST fail.
- The response MUST include an ETag derived from the source hash.
- `If-None-Match` with the current ETag returns `304`.
- Cache-Control MUST force revalidation.

`PUT /agents/<agentName>/api/book` updates the source.

Behavior:

- Authentication is required.
- Embedded book-scoped agents cannot be updated directly.
- Optional query `versionName` names the history snapshot.
- The body is plain text.
- The source MUST be trimmed, validated, padded, persisted, and history-preserved.
- Organization caches MUST be invalidated.
- The response returns success status, message, and resulting source.

## History

`GET /agents/<agentName>/api/book/history` returns source snapshots newest first.

`POST /agents/<agentName>/api/book/history` restores a snapshot. The body contains:

```json
{
  "historyId": 123
}
```

The restored source MUST belong to the same current `permanentId`.

## Reference Diagnostics

`POST /agents/<agentName>/api/book/reference-diagnostics` analyzes references in a draft source.

Behavior:

- Authentication is required.
- The body can be current editor text and does not need to pass full book validation.
- Query `forceRefresh` MAY bypass caches.
- The response includes diagnostics and missing agent references.

## Model Requirements

`/agents/<agentName>/api/model-requirements` exposes resolved model requirements for debugging/integration. It MUST use the same source-resolution path as chat runtime and MUST respect access control.

Prepared model requirements MAY be cached on `Agent.preparedModelRequirements`, but they MUST be invalidated or recomputed when the source fingerprint changes.

## Standalone Documentation

Each server exposes standalone book-language documentation at `/api/docs/book.md`. This documentation SHOULD be generated from the same commitment semantics used by the server and Promptbook Engine.

