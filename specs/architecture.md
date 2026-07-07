# Architecture

Agents Server is a single web application that serves three surfaces from one origin:

1. **Web UI** — pages for browsing, chatting with, and editing agents, plus administration.
2. **HTTP APIs** — public agent APIs, OpenAI-compatible APIs, a stable management API, and internal worker APIs.
3. **Static/meta surfaces** — robots, sitemap, manifest, embed script, documentation.

## Component split: Promptbook Engine vs. Agents Server

-   The **Promptbook Engine** is a framework-agnostic library implementing the [Book language](book-language.md): parsing agent sources, compiling them into model requirements, and executing agents against LLM providers. It can run standalone (library, CLI) or inside applications.
-   The **Agents Server** (this specification) is the application that persists agents and conversations, exposes them over HTTP, renders the UI, and orchestrates background work. It embeds the Engine for all Book-language concerns.

A compatible Agents Server MUST embed a Book-language implementation with the semantics described in [Book language](book-language.md); everything else in these specs is server behavior.

## Major subsystems

| Subsystem            | Responsibility                                                                                | Spec                                                        |
| -------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Request routing      | Host → server-instance resolution, agent-name redirects, custom domains, access restriction.  | [Servers and multi-tenancy](servers-and-multi-tenancy.md)   |
| Agent store          | CRUD, history, folders, visibility, soft deletion.                                             | [Agents](agents.md)                                         |
| Chat runtime         | Stateless streaming chat and durable queued chats.                                             | [Chats](chats.md)                                           |
| Identity             | Users, sessions, API tokens, worker token, team token.                                         | [Users and authentication](users-and-authentication.md)     |
| Persistence          | One relational database, namespaced per server instance by table prefix.                       | [Data model](data-model.md)                                 |
| Configuration        | Environment variables (deployment-scoped) and `Metadata` rows (instance-scoped, admin-editable). | [Configuration](configuration.md)                         |
| Background work      | Job/timeout workers, agent preparation, migrations at startup.                                 | [Background workers](operations/background-workers.md)      |
| File storage         | Uploads and generated assets on a CDN/S3-compatible store.                                     | [Attachments and files](chat/attachments-and-files.md)      |

## Request lifecycle

Every incoming HTTP request (except explicitly excluded infrastructure paths, see below) passes through a **middleware pipeline** before reaching a page or API handler:

1. **Content-Security-Policy nonce** — a fresh single-use nonce is generated per request and attached so only server-rendered inline scripts (theme bootstrap, custom JavaScript, analytics) may execute. The CSP header is applied to every response.
2. **Request context resolution** — the `Host` header is resolved against the server registry to determine the current server instance and its table prefix; custom domains are resolved to an agent; instance settings (allowed IPs, embedding allowance, server visibility) are loaded. See [Servers and multi-tenancy](servers-and-multi-tenancy.md).
3. **Access control** — when the instance restricts access by IP (`RESTRICT_IP`), requests are allowed when at least one of: client IP matches the allowlist, a session cookie is present, or a valid API token is presented. Otherwise the request is answered with the restricted page/response. See [Users and authentication](users-and-authentication.md#restricted-access).
4. **Routing rewrites**:
    -   `/:first…` where `first` is **not** a reserved path and does not start with `.` → HTTP redirect to `/agents/:first…` (with permissive CORS headers on the redirect). Reserved paths are the fixed top-level route names of the application (generated from the route tree, e.g. `admin`, `agents`, `api`, `docs`, `system`, static asset names, `_next`, `manifest.webmanifest`).
    -   Requests on a **custom domain** that resolves to an agent are rewritten to that agent's path, forwarding the resolved server domain in the `x-promptbook-server` request header.
5. **Response headers** — visibility headers (crawling/indexing hints) and, for embeddable routes, a `frame-ancestors` allowance are appended. See [Embedding and PWA](ui/embedding-and-pwa.md).

Excluded from the middleware: static assets (`_next/static`, `_next/image`, favicon, logos, fonts), `robots.txt`, `/api/health` (readiness probe MUST NOT depend on database lookups), and `/api/internal/*` (authorized separately by the worker token).

## Startup

At process start the server MUST:

1. Load environment configuration (optionally from an `.env` file in local/CLI mode).
2. Run [automatic database migrations](operations/migrations.md) when enabled (`SUPABASE_AUTO_MIGRATE`), without blocking request handling on failure (errors are logged with full database diagnostics).
3. [Seed](agents.md#seeding) the hidden `.core` folder with the bundled well-known agents (Adam, Teacher) and, on an empty server, the bundled default agents.

## Deployment shapes

The same application runs in three shapes (details in [Deployment](operations/deployment.md)):

-   **Hosted multi-server** — one deployment serves many registered server instances (domains), each with its own table prefix in a shared PostgreSQL database.
-   **Standalone VPS** — single-instance deployment, optionally bootstrapped over a raw IP address before a domain exists, with self-update capability.
-   **Local CLI** — `ptbk agents-server init/start` runs the packaged app locally, with either Supabase/PostgreSQL or a local SQLite database file (SQLite mode emulates the same SQL surface).

## External services

The reference implementation depends on: an OpenAI-compatible LLM provider (agent execution, embeddings, transcription), an S3-compatible object store/CDN (files, images), optional ElevenLabs (TTS), optional email providers (SendGrid/SMTP/ZeptoMail), optional Google OAuth (calendar), optional GitHub App (projects), and optional web-push. Each is specified in its own spec; all are optional except the LLM provider and the database.
