# Agents Server Specification

This folder is the functional specification of the **Promptbook Agents Server** — the web and API application where AI agents written in the [Book language](book-language.md) live, are edited, and chat with users.

The purpose of these specs is to be the **single source of truth** for the functionality of the Agents Server. They are written so that a compatible server (and the agents running on it) can be implemented **without access to the original source code**, and so they can be used for development, testing, and documentation of the existing implementation.

## How to read these specs

-   The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are used as in RFC 2119.
-   The specs describe **observable behavior and persisted state**, not internal code structure. A compatible implementation MAY use any technology stack. Facts specific to the reference implementation (Next.js, Supabase/PostgreSQL, Vercel) are labelled _reference implementation_.
-   Database tables are written with the placeholder prefix `prefix_` (for example `prefix_Agent`). The actual prefix is resolved per server instance — see [Servers and multi-tenancy](servers-and-multi-tenancy.md).
-   URL path parameters are written with a leading colon, for example `/agents/:agentName/api/chat`.
-   Orphaned or experimental code paths of the reference implementation are intentionally omitted.

## Core specs (root)

| Spec                                                           | Responsibility                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Architecture](architecture.md)                                | Components, deployment shapes, request lifecycle, split between Promptbook Engine and Agents Server. |
| [Agents](agents.md)                                            | The agent entity: identity, source, profile, visibility, lifecycle.                                  |
| [Book language](book-language.md)                              | Agent source syntax, commitments, parsing, and model-requirements compilation.                       |
| [Chats](chats.md)                                              | The two chat models (stateless and durable), shared chat behavior.                                   |
| [Users and authentication](users-and-authentication.md)        | Identity kinds, sessions, passwords, tokens, authorization boundaries.                               |
| [Servers and multi-tenancy](servers-and-multi-tenancy.md)      | Server registry, table prefixes, host resolution, custom domains, server visibility.                 |
| [Data model](data-model.md)                                    | All persisted tables, their columns, and invariants.                                                 |
| [Configuration](configuration.md)                              | Environment variables, `Metadata` keys, server limits, custom CSS/JS.                                |
| [Routes](routes.md)                                            | Complete inventory of pages and HTTP endpoints, linking to the owning spec.                          |

## Detailed specs (subfolders)

### Agents

-   [Inheritance and imports](agents/inheritance-and-imports.md) — `FROM`, `IMPORT`, the Adam ancestor, book-scoped sub-agents.
-   [Federation](agents/federation.md) — listing and importing agents from federated servers.
-   [Folders and organization](agents/folders-and-organization.md) — folder tree, ordering, appearance, recycle bin.
-   [Avatars and visuals](agents/avatars-and-visuals.md) — avatar resolution, generated images, default visuals.
-   [Preparation and caching](agents/preparation-and-caching.md) — background preparation, knowledge indexing, caches and locks.
-   [Self-learning](agents/self-learning.md) — append-only agent-source learning and the Teacher agent.
-   [Transfer and backup](agents/transfer-and-backup.md) — import/export, cloning, books and server backups.

### Chat

-   [Stateless chat](chat/stateless-chat.md) — the `POST /agents/:agentName/api/chat` pipeline.
-   [Streaming protocol](chat/streaming-protocol.md) — markdown deltas, keep-alive tokens, tool-call frames.
-   [User chats](chat/user-chats.md) — durable chats, queued jobs, job leases, snapshot streaming, replies, drafts.
-   [Timeouts](chat/timeouts.md) — scheduled wake-ups (`USE TIMEOUT`), recurrence, limits.
-   [Attachments and files](chat/attachments-and-files.md) — uploads, file security checking, storage and serving.
-   [History and feedback](chat/history-and-feedback.md) — frozen chat history chains and user feedback.
-   [Voice](chat/voice.md) — text-to-speech, speech-to-text, voice calling flags.
-   [Runtime tools](chat/runtime-tools.md) — tools exposed to models (browser, search, spawn, email, progress, …).

### APIs

-   [Public agent API](api/public-agent-api.md) — profile, book, model requirements, disclaimer, MCP per agent.
-   [OpenAI compatibility](api/openai-compatibility.md) — OpenAI/OpenRouter-compatible chat-completions endpoints.
-   [Management API](api/management-api.md) — the stable external `/api/v1` API.
-   [Internal workers API](api/internal-workers.md) — worker-token routes powering background processing.

### Users

-   [Memory](users/memory.md) — persistent user memory and its runtime injection.
-   [Wallet](users/wallet.md) — stored credentials and their resolution for `USE …` commitments.
-   [Settings and notifications](users/settings-and-notifications.md) — user preferences, control panel, push subscriptions.

### Integrations

-   [Email](integrations/email.md) — outgoing message providers and inbound email webhook.
-   [Calendar](integrations/calendar.md) — Google Calendar OAuth and calendar connections.
-   [GitHub projects](integrations/github-projects.md) — GitHub App integration for `USE PROJECT`.

### User interface

-   [Navigation](ui/navigation.md) — header hierarchy, menus, control panel.
-   [Pages](ui/pages.md) — public and authenticated pages.
-   [Admin](ui/admin.md) — administrator sections under `/admin`.
-   [Embedding and PWA](ui/embedding-and-pwa.md) — embed script, iframe/headless chat, manifest, share target.

### Operations

-   [Migrations](operations/migrations.md) — database migration mechanism and rules.
-   [Background workers](operations/background-workers.md) — worker cadence, triggering, and recovery.
-   [Deployment](operations/deployment.md) — hosted, standalone VPS, and local CLI deployment shapes.

## Replication rules

An implementation is considered compatible when it preserves:

1. The URL semantics and route behavior in [Routes](routes.md) and the API specs.
2. The authentication and authorization boundaries in [Users and authentication](users-and-authentication.md).
3. The persisted state and state transitions in [Data model](data-model.md), [Agents](agents.md), and [User chats](chat/user-chats.md).
4. The chat streaming surface in [Streaming protocol](chat/streaming-protocol.md).
5. The Book-language semantics in [Book language](book-language.md) (agents written for one server MUST behave the same on another).
6. The configuration surface in [Configuration](configuration.md) — same defaults, same meaning of every key.

Anything not covered by these specs (internal code layout, framework, hosting provider, caching strategy) is an implementation choice, provided the externally visible contracts stay intact.
