# Inheritance and Imports

How one stored [agent source](../agents.md#persisted-agent-state) becomes the **effective (resolved) source** that is actually compiled and executed. Resolution expands `FROM` (inheritance) and `IMPORT` (textual inclusion) commitments, rewrites compact agent references into canonical URLs, and degrades gracefully when references cannot be loaded.

## Terminology

-   **Unresolved source** — the editable child source stored in `prefix_Agent.agentSource`.
-   **Resolved source** — the unresolved source with all `FROM`/`IMPORT` content materialized inline. Everything downstream (profile with inheritance, [model requirements](../book-language.md#two-stage-parsing), chat execution) operates on the resolved source; only the unresolved source is ever written back to the database (see [Self-learning](self-learning.md) for the one exception's mechanics).

## Compact reference resolution

Commitment content may reference agents in compact forms; the server MUST expand them to canonical agent URLs before import:

| Reference form                          | Resolution                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `{Agent Name}` / bare name               | Case-/diacritics-insensitive lookup (`normalizeAgentName`) against local agents.  |
| Permanent id (base58 heuristic)          | Lookup in the local `permanentId` index.                                           |
| Full agent URL                           | Used as-is.                                                                        |
| Pseudo-agent reference (below)           | Mapped to a pseudo-agent URL / special semantics.                                  |

Resolution order for names/ids: **local agents first**, then each configured [federated server](federation.md) (remote lookup maps are fetched with a 1.5 s timeout and cached per server; failures degrade to "not found"). The commitments that carry agent references are `FROM`, `IMPORT`/`IMPORTS`, and `TEAM`.

**Unresolved references MUST NOT fail the resolution.** Each commitment has a safe fallback, and every unresolved token is tracked as a *resolution issue* which is materialized into the resolved source as a visible `NOTE` line (deduplicated per commitment type + reference):

-   `FROM` → `NOTE Referenced agent "X" in FROM commitment was not found. Inheritance skipped.`
-   `IMPORT` → `NOTE Referenced agent "X" in IMPORT commitment was not found. Import skipped.`
-   `TEAM` → `NOTE Referenced agent "X" in TEAM commitment was not found. Teammate disabled.`

The book editor surfaces the same diagnostics via `GET /agents/:agentName/api/book/reference-diagnostics` (unresolved references, name collisions) and offers one-click creation of a missing referenced agent via `POST /agents/:agentName/api/book/missing-agent` (signed-in only; reuses an existing active agent with the same normalized name, restores a soft-deleted one, or creates a new boilerplate agent).

### Pseudo-agents

Two reserved references never resolve to real agents:

| Pseudo-agent | Aliases                       | Meaning                                                                                                         |
| ------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `{User}`      | `@User`, `user`, `USER`, …     | The human currently using the agent. In `TEAM`, consulting `{User}` pauses and asks the user through a modal; each reply is single-use. |
| `{Void}`      | `{Null}` and case variants     | Intentional nothingness. `FROM VOID` disables the implicit ancestor; as a teammate it means "no agent".            |

Pseudo-agents have canonical pseudo URLs and informational profile pages at `/agents/user` and `/agents/void`. They MUST be accepted (case-insensitively) wherever agent references are accepted in commitments that allow them.

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

**Adam** is the default ancestor of every agent. Default URL: `https://core.ptbk.io/agents/adam`; each server [seeds](../agents.md#seeding) its own local Adam in the hidden `.core` folder and resolves the ancestor URL against the local instance (`getWellKnownAgentUrl('ADAM')`), so inheritance works offline. Adam's book carries the baseline persona and rules shared by all agents. Editing the local Adam changes the effective behavior of every agent on the instance that does not opt out via `FROM VOID` or an explicit `FROM`.

## `IMPORT` — textual inclusion

Each `IMPORT <reference>` line is processed independently, in place:

-   Reference resolved compactly; a non-URL, non-agent value (e.g. a file path the server does not recognize) leaves the line untouched.
-   An agent URL is imported and embedded as `NOTE Imported from <url>` + corpus + `NOTE ===========` (same corpus rules as `FROM`).
-   Multiple `IMPORT`s are allowed; failures produce NOTE fallbacks per reference.

## Import mechanics (shared by `FROM` and `IMPORT`)

1. **Same-instance short-circuit** — an optional local importer resolves URLs that point to agents of the same server directly from the database (no HTTP round-trip).
2. **HTTP import with fallback** — other URLs are fetched from the owning (possibly [federated](federation.md)) server with bounded retries (`maxAttempts`, `retryDelayMs` from the [federated import configuration](../configuration.md#server-limits)). Concurrent imports of the same URL are deduplicated in flight.
3. **Missing-agent fallback book** — when all attempts fail, the importer returns a generated placeholder book (`Not found agent` + NOTE with URL, attempt count, reason + `CLOSED`) and caches this negative result for 60 s, so an unavailable remote agent cannot stall every navigation.
4. **Cycle detection** — the resolution stack tracks visited agent URLs (including aliases of the current agent). A `FROM`/`IMPORT` edge to an already-visited URL MUST fail resolution with a diagnostic listing the cycle chain.

## Book-scoped references

A team reference to an agent that is **not** a standalone row but is defined inside another agent's book resolves to a **book-scoped sub-agent**. Its route identifier is a synthetic reversible token, `__book_agent__~<base64url(parentIdentifier)>~<base64url(normalizedEmbeddedName)>`, accepted anywhere `:agentName` is accepted:

-   Access checks apply to the **parent** agent ([visibility](../agents.md#visibility), deletion).
-   The sub-agent's source is extracted from the parent's book; profile/chat/API routes serve it like a normal agent.
-   Book-scoped agents are ephemeral projections: they have no own row, no history, and [self-learning](self-learning.md) MUST NOT write back to them.

## Where resolution happens

Resolution runs in every consumer of the effective source: chat execution ([stateless](../chat/stateless-chat.md), [durable](../chat/user-chats.md), [OpenAI-compatible](../api/openai-compatibility.md)), [profile](../api/public-agent-api.md#profile) and system-message rendering, [preparation](preparation-and-caching.md), and avatar/manifest generation. Results are cached per agent hash (see [Preparation and caching](preparation-and-caching.md#runtime-caches)); the raw stored source is never mutated by resolution.
