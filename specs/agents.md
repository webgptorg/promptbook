# Agents

An **agent** is the central entity of the Agents Server: an AI persona defined by a plain-text **agent source** written in the [Book language](book-language.md), persisted per server instance, and exposed through the UI and APIs.

## Identity

Every agent row carries three identifiers (persisted in `prefix_Agent`, see [Data model](data-model.md#prefix_agent)):

| Identifier    | Nature                                                                | Uniqueness                              | Stability                                        |
| ------------- | --------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------ |
| `permanentId` | Random base58 string assigned by the server at creation.              | Unique per server instance.             | Never changes; the canonical reference.          |
| `agentName`   | Human-readable name; the first line of the agent source.              | **Not** unique (duplicates allowed).    | Changes whenever the first source line changes.  |
| `agentHash`   | Hash of the current agent source, used for integrity and cache keys.  | Shared by identical sources.            | Changes on every source edit.                    |

**Identifier resolution rule:** wherever a route or API accepts an *agent identifier* (`:agentName` path segments, API bodies), the server MUST accept **either** the `agentName` **or** the `permanentId` and resolve it with an `agentName`-or-`permanentId` lookup returning the first match. Because names are not unique, `permanentId` is the only reliable reference; generated URLs SHOULD prefer `permanentId` when available. `resolveCanonicalAgentName` maps any identifier back to the stored `agentName`.

Agents also reference each other by **agent URL** — `https://<server-domain>/agents/<identifier>` — used by inheritance, imports, team references, and federation.

### Book-scoped sub-agents

An identifier of the form `<parentIdentifier>.{Sub Agent Name}` refers to an agent **defined inside another agent's book** (for example through team references). Routes that accept agent identifiers MUST parse this form, apply access checks against the *parent* agent, and resolve the sub-agent's source from the parent's book. See [Inheritance and imports](agents/inheritance-and-imports.md#book-scoped-references).

## Persisted agent state

For each agent the server persists:

-   `agentSource` — the raw Book-language text (single source of truth for behavior).
-   `agentProfile` — JSON snapshot of the parsed profile (see below), denormalized for fast listing.
-   `agentHash`, `permanentId`, `agentName` — identity (above).
-   `preparedModelRequirements` — optional cached compilation output (see [Preparation and caching](agents/preparation-and-caching.md)).
-   `promptbookEngineVersion` — engine version that last wrote the row.
-   `visibility` — `PUBLIC` | `UNLISTED` | `PRIVATE` (below).
-   `folderId`, `sortOrder` — placement (see [Folders and organization](agents/folders-and-organization.md)).
-   `userId` — optional owner (used by the [Management API](api/management-api.md) for per-token ownership scoping).
-   `createdAt`, `updatedAt`, `deletedAt` — lifecycle timestamps (`deletedAt` = soft deletion).
-   `usage` — accumulated usage JSON (token/cost accounting).

## Agent profile

The **profile** is derived from the agent source by the lightweight synchronous parser (`parseAgentSource`, see [Book language](book-language.md#two-stage-parsing)) and contains:

-   `agentName` (first line), `agentHash`, `permanentId`
-   `personaDescription` — from the last `GOAL`/`GOALS` commitment (falling back to `PERSONA`/`PERSONAE` for backward compatibility)
-   `initialMessage` — from `INITIAL MESSAGE`
-   `meta` — key/value map from `META <TYPE> …` commitments (`fullname`, `description`, `image`, `avatar`, `color`, `font`, `domain`, `voice`, `visibility`, `disclaimer`, `inputPlaceholder`, `messageSuffix`, …); later commitments of the same type override earlier ones
-   `links` (from `META LINK`), `parameters` (`@Parameter` / `{parameter}` notations), `capabilities` (from `USE …`/`KNOWLEDGE` commitments), `samples` (question/answer pairs), `knowledgeSources`

The profile is served publicly for accessible agents via `GET /agents/:agentName/api/profile` (see [Public agent API](api/public-agent-api.md)).

## Visibility

Each agent has exactly one visibility value:

| Value      | Listing (home, search, sitemap)          | Direct access (profile/chat/APIs)                          |
| ---------- | ---------------------------------------- | ----------------------------------------------------------- |
| `PUBLIC`   | Listed for everyone.                     | Everyone.                                                    |
| `UNLISTED` | Hidden from anonymous listings.          | Everyone who knows the URL.                                  |
| `PRIVATE`  | Hidden from anonymous listings.          | Only signed-in users, or requests carrying a valid same-server **team token** on routes that opt in (`allowTeamInternalAccess`). |

Rules:

-   The default visibility for new agents comes from the `DEFAULT_VISIBILITY` metadata key (default `UNLISTED`), unless the source itself declares `META VISIBILITY <value>` or the creator specifies one explicitly.
-   Denied access to a `PRIVATE` agent MUST yield HTTP 403 with the message "This agent is private. Sign in to access it."
-   Whether an agent appears in **public listings** additionally depends on the instance-level [server visibility](servers-and-multi-tenancy.md#server-visibility).
-   The team token is specified in [Users and authentication](users-and-authentication.md#team-internal-access-token).

## Lifecycle

### Creation

Agents are created by:

1. **UI "Add agent"** — a server action generates a boilerplate book whose agent name is drawn from a name pool (`NAME_POOL` metadata: `ENGLISH` or `CZECH`), then persists it. Depending on the `NEW_AGENT_WIZARD` metadata mode, the UI opens either the plain book editor or a guided wizard that composes the initial book.
2. **API** — `POST /api/agents` (session-authenticated), the [Management API](api/management-api.md) (`POST /api/v1/agents`, assigns `userId` ownership from the token), [import](agents/transfer-and-backup.md), [cloning](agents/transfer-and-backup.md#cloning), the [spawn tool](chat/runtime-tools.md#spawn_agent), or the missing-agent recovery flow (below).

On creation the server MUST: assign a fresh `permanentId`, compute `agentHash`, parse and store `agentProfile`, apply default visibility, and append the first [history entry](#history).

### Editing

Editing replaces the whole `agentSource` (there is no partial patching). On every source change the server MUST:

1. Re-parse the profile, recompute `agentHash`, update `agentName` from the first line, bump `updatedAt`.
2. Append an entry to `prefix_AgentHistory` containing the previous chain (`previousAgentHash`) and the new source; entries MAY carry a user-provided `versionName`.
3. Invalidate/refresh cached model requirements and schedule [preparation](agents/preparation-and-caching.md) when relevant.

Sources are edited through the book editor page and `GET/PUT` book API (see [Public agent API](api/public-agent-api.md#book)); history is listed via the book history API and the history page.

### Soft deletion and restore

-   Deleting an agent sets `deletedAt` (row and history are retained). Deleted agents:
    -   disappear from listings and folders,
    -   respond to chat APIs with HTTP **410 Gone** and error code `agent_deleted` ("This agent has been deleted. You can restore it from the Recycle Bin."),
    -   appear in the **Recycle bin** page for signed-in users.
-   Restore clears `deletedAt` (`POST /api/agents/:agentName/restore`). Folders soft-delete/restore analogously.

### Seeding

On startup the server ensures well-known content exists (idempotently):

-   **Core agents** — a hidden folder named `.core` containing the bundled well-known agents:
    -   **Adam** (`adam`) — the default ancestor for all agents (see [Inheritance](agents/inheritance-and-imports.md#the-adam-ancestor)),
    -   **Teacher** (`teacher`) — the Book-language expert used by [self-learning](agents/self-learning.md).
    Folders whose name starts with `.` are hidden from normal navigation (header menu, listings).
-   **Default agents** — when the server has no agents at all, the bundled default `*.book` files are inserted once (skipped when any agent exists or no bundled books are found).

## Ownership

`Agent.userId` records an owning user. It is set when an agent is created through the Management API (token owner) and MAY be set by other flows. Ownership scopes Management API reads/writes; the web UI treats all signed-in users of an instance as one team and does not restrict by owner.

## Related specs

-   [Inheritance and imports](agents/inheritance-and-imports.md) — how one source is resolved into the effective source.
-   [Preparation and caching](agents/preparation-and-caching.md) — background work triggered by source changes.
-   [Avatars and visuals](agents/avatars-and-visuals.md) — how the visual identity is resolved and generated.
-   [Federation](agents/federation.md) — agents hosted on other servers.
-   [Transfer and backup](agents/transfer-and-backup.md) — moving agents between servers.
