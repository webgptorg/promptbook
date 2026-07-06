# Glossary

Canonical vocabulary used throughout these specs. Terms are cross-linked to their detailed specs.

## Core domain

- **Agent** — An AI persona hosted by the server, defined by its [agent source](#agent-source). The
  central entity. See [Agent](./agent.md).
- **Agent source** (`agentSource`) — The plain-text [Book language](./book-language.md) document that
  defines an agent. Editable single source of truth for the agent's behavior.
- **Book language** (a.k.a. "Book 2.0") — The domain-specific language agents are written in. See
  [Book language](./book-language.md).
- **Commitment** — One directive in the Book language (e.g. `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`,
  `META IMAGE`). Commitments are the vocabulary of the Book language. See [Commitments](./commitments.md).
- **Agent model requirements** — The "compiled" form of an agent: system message, tools, model, samples,
  etc. Produced from the source by the Engine. See [Agent model requirements](./agent-model-requirements.md).
- **Agent profile** — Presentational metadata derived from the source (name, description, avatar, color,
  disclaimer, …). Stored as JSON on the agent row.
- **Persona** — Historically the agent's role/description (`PERSONA` commitment); superseded by `GOAL`.

## Identity

- **`agentName`** — Human-readable name of an agent, derived from the first non-commitment line of the
  source. **Not unique** — multiple agents may share a name.
- **`permanentId`** — Stable, unique identifier of an agent (a random UUID/base58 string), assigned by the
  server and never changed across edits. The durable key used by chats, memory, wallet, etc.
- **`agentHash`** — Content hash of the current `agentSource`; identifies a specific version.
- **Route identifier** — The token used in URLs (`/agents/<identifier>`). Prefer `permanentId`, fall back
  to `agentName`. See [Agent routing](./agents/references-and-composition.md).

## Server & tenancy

- **Server** (logical/Agents Server) — One branded instance (name, domain, agents, users, settings). Many
  logical servers can share one deployment and database. See [Multi-server model](./architecture/multi-server.md).
- **`_Server` registry** — Global (unprefixed) table mapping domain → table prefix → environment for every
  logical server.
- **Table prefix** — Per-server string prepended to every table name (e.g. `server_Core_Agent`). Chosen per
  request by the middleware. See [Database](./architecture/database.md).
- **Environment** — A server's lifecycle stage: `LTS`, `PREVIEW`, `PRODUCTION`, `LIVE`. Governs migrations.
- **Metadata** — Runtime, admin-editable key/value configuration for a server. See
  [Configuration](./architecture/configuration.md).

## Chat

- **User chat** (`UserChat`) — A persisted conversation between one user and one agent.
- **User chat job** (`UserChatJob`) — A durable background unit of work that generates one assistant reply.
  States: `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`. See [Chat execution](./chat/execution-model.md).
- **Timeout** (`UserChatTimeout`) — A scheduled future wake-up inside a chat (the `USE TIMEOUT` capability).
  May recur. See [Timeouts](./chat/timeouts-and-scheduling.md).
- **Runner** — The strategy that actually produces a reply: direct LLM streaming, a **local** coding-agent
  harness, or an **external** git-backed coding-agent. See [Runners](./chat/runners.md).
- **Worker** — An internal, token-authorized route that claims and advances queued jobs/timeouts. See
  [Chat execution](./chat/execution-model.md).
- **Lease / heartbeat** — The mechanism that lets exactly one worker own a `RUNNING` job and recover it if
  the worker dies.
- **Frozen chat** — A read-only chat imported from an external source (e.g. the OpenAI-compatible API);
  view-only in the web UI.

## Composition & federation

- **Reference** — A compact `{Agent Name}` token inside a commitment, resolved to a concrete agent URL. See
  [References & composition](./agents/references-and-composition.md).
- **Inheritance** (`FROM`) — An agent deriving from a parent agent's source.
- **Import** (`IMPORT`) — Injecting another agent's/file's content into an agent.
- **Team** (`TEAM`) — Registering other agents as callable tools ("teammates").
- **Federation** — Listing/importing agents from other Agents Servers. See [Federation](./features/federation.md).
- **Pseudo-agent** — A special reference target such as `{User}` or `{Void}` (explicit "no parent").

## People & access

- **User** — An authenticated account (`username`, `passwordHash`, `isAdmin`, auth provider). See
  [Users & auth](./architecture/security-and-access.md).
- **Admin** — A user with elevated privileges within a server (`isAdmin`).
- **Global admin** — The environment-backed super-admin (via `ADMIN_PASSWORD`).
- **Session** — A signed cookie (`sessionToken`) carrying the authenticated identity.
- **API token / management API key** — A `ptbk_...` bearer token, owned by a user, for programmatic access.
- **Private mode** — A per-user browser setting that suppresses persistence of chat history/telemetry.

## Capabilities/integrations (selected)

- **Externals** — Provider-side resources prepared for an agent (e.g. vector stores, OpenAI assistants),
  tracked in `AgentExternals`. See [Agent preparation](./agents/preparation.md).
- **Knowledge** — Grounding documents/URLs attached via `KNOWLEDGE`, indexed for retrieval + citations.
- **Memory** — Persisted facts the agent may recall across chats (`UserMemory`, self-learning).
- **Wallet** — Stored credentials (username/password, cookies, tokens) an agent may use on the user's behalf.
- **Harness** — A coding-agent CLI (e.g. GitHub Copilot, Claude Code) driven by a runner to answer chats.
