# Agent

An **agent** is the central entity of the Agents Server: an AI persona that users chat with. Everything an
agent *is* comes from its **agent source** — a [Book language](./book-language.md) document. Everything the
server does around it (storage, identity, versioning, execution) is described here and in [`agents/`](./agents/).

## The source is the source of truth

An agent is fundamentally one editable text document (`agentSource`). From that text the server derives:

- the **name** (first non-commitment line),
- the **profile** (avatar, description, disclaimer, color, … from `META*`/`GOAL`),
- the **capabilities** (`USE *`, `MEMORY`, …),
- and, when compiled, the [agent model requirements](./agent-model-requirements.md) that actually drive
  the LLM.

Two functions in the Engine do this derivation (see [Book language](./book-language.md)):

- **`parseAgentSource`** — fast, synchronous; extracts name, description, meta, capabilities, samples,
  references. Used everywhere the UI needs cheap info.
- **`createAgentModelRequirements`** — asynchronous; applies commitments one-by-one, resolves references,
  and produces the compiled model requirements. Used to actually run the agent.

## Identity model

An agent has three identifiers with different guarantees:

| Identifier | Unique? | Stable across edits? | Purpose |
|---|---|---|---|
| `permanentId` | **Yes** | **Yes** | Durable key. Referenced by chats, memory, wallet, timeouts, externals, folders' agents. Assigned at creation (random UUID); never changes. |
| `agentName` | No | No (changes if first line changes) | Human-readable label; also usable in URLs and references. |
| `agentHash` | Identifies a version | No (changes every edit) | Content hash of the current source; ties prepared artifacts and history to a specific version. |

> Duplicate `agentName`s are explicitly allowed. Any feature that must reliably point at "this agent" uses
> `permanentId`. The web route `/agents/<identifier>` accepts either a `permanentId` (preferred) or an
> `agentName`; resolution rules are in [References & composition](./agents/references-and-composition.md).

## Ownership, placement, visibility

- **Owner** (`userId`) — the user who created the agent. Governs who can edit it and appears in the
  [management API](./api/management-api-v1.md).
- **Folder** (`folderId`) — optional placement in the [agent folder tree](./agents/lifecycle.md). Ordering
  is controlled by `sortOrder`.
- **Visibility** — one of `PUBLIC`, `UNLISTED`, `PRIVATE`:
  - `PRIVATE` — only visible to the owner/admins.
  - `UNLISTED` — reachable by direct link but not listed in directories/sitemaps.
  - `PUBLIC` — listed and (on a `PUBLIC` server) crawlable/indexable.
  - The default for new agents is the `DEFAULT_VISIBILITY` metadata (ships as `UNLISTED`).
  - See [Visibility & indexing](./architecture/security-and-access.md).

## Lifecycle (summary)

Full detail in [Agent lifecycle](./agents/lifecycle.md). At a glance:

- **Create** — from a boilerplate/wizard or via API; a `permanentId` is minted; the first version is
  recorded in history.
- **Edit** — saving new source recomputes `agentName`, `agentHash`, and `agentProfile`, appends a version
  to [history](./data-model/agent.md), and (asynchronously) schedules [preparation](./agents/preparation.md).
- **Version history** — every source change is retained in `AgentHistory`; versions can be named and
  restored.
- **Clone** — copies an agent (new `permanentId`).
- **Soft delete** — sets `deletedAt`; the agent moves to the [recycle bin](./features/admin.md) and can be
  restored. Deleting cascades to its chats, history, memory, wallet, etc. via `permanentId`.
- **Import/export** — agents (and folders) can be exported to and imported from files. See
  [Agent transfer](./features/agents-management.md).

## Derived artifacts stored alongside the agent

Because compilation and provider setup are expensive, the server caches derived artifacts keyed by
`agentHash`:

- **`agentProfile`** (JSON) — presentational profile, recomputed on every source change.
- **`preparedModelRequirements`** (JSON) — compiled model requirements, recomputed only on explicit
  [preparation](./agents/preparation.md), not on every edit.
- **Externals** (`AgentExternals`) — provider resources (vector stores, OpenAI assistants) created during
  preparation; keyed by `(type, hash)`.
- **`usage`** (JSON) — accumulated spend/usage statistics.

See the [agent data model](./data-model/agent.md) for exact columns.

## What an agent can do

An agent's abilities are exactly what its commitments declare:

- **Profile/identity** — `PERSONA`/`GOAL`, `META *`. See [Commitments](./commitments.md).
- **Behavior** — `RULE`, `KNOWLEDGE`, `STYLE`, `FORMAT`, samples, messages.
- **Capabilities/tools** — `USE BROWSER`, `USE SEARCH ENGINE`, `USE DEEPSEARCH`, `USE EMAIL`,
  `USE CALENDAR`, `USE IMAGE GENERATOR`, `USE TIMEOUT`, `USE SPAWN`, `USE PROJECT`, `USE MCP`, `MEMORY`,
  `WALLET`, … See [Tools & capabilities](./features/tools-and-capabilities.md).
- **Composition** — `FROM` (inherit), `IMPORT` (reuse), `TEAM` (delegate). See
  [References & composition](./agents/references-and-composition.md).

## Related specs

- [Book language](./book-language.md) · [Commitments](./commitments.md) ·
  [Agent model requirements](./agent-model-requirements.md)
- [Agent lifecycle](./agents/lifecycle.md) · [Preparation](./agents/preparation.md) ·
  [References & composition](./agents/references-and-composition.md) · [Knowledge](./agents/knowledge.md)
- [Agent data model](./data-model/agent.md) · [Chat](./chat.md)
