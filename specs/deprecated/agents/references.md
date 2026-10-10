# Agent references (historical)

> Historical specification retained from the older Agents Server specs. It has lower authority, especially for implementation details; see the [archive policy](../_index.md).

[Historical index](../_index.md) · [Dictionary](../../dictionary.md)

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

## Book-scoped references

A team reference to an agent that is **not** a standalone row but is defined inside another agent's book resolves to a **book-scoped sub-agent**. Its route identifier is a synthetic reversible token, `__book_agent__~<base64url(parentIdentifier)>~<base64url(normalizedEmbeddedName)>`, accepted anywhere `:agentName` is accepted:

-   Access checks apply to the **parent** agent (visibility (historical page: `../agents.md#visibility`), deletion).
-   The sub-agent's source is extracted from the parent's book; profile/chat/API routes serve it like a normal agent.
-   Book-scoped agents are ephemeral projections: they have no own row, no history, and [self-learning](self-learning.md) MUST NOT write back to them.

## Related historical specifications

- [Source resolution](source-resolution.md)
- [Inheritance](inheritance.md)
- [Imports](imports.md)
- [Federation](federation.md)
