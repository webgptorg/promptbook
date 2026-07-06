# Architecture

Agents Server is a multi-tenant Next.js application that hosts Promptbook agents. It provides web pages, public APIs, authenticated management APIs, background workers, and administrative controls around the Promptbook Engine.

## Responsibilities

Agents Server MUST provide these responsibilities:

- Store agents written in the book language.
- Resolve agents by name, permanent id, folder placement, ownership, visibility, and custom domain.
- Serve profile, chat, book-editing, integration, history, image, timeout, and export views for agents.
- Execute stateless chat requests and durable queued user-chat jobs.
- Persist chat history, feedback, durable chats, user data, files, messages, and operational records.
- Expose a stable management API at `/api/v1`.
- Support per-server configuration through metadata, environment variables, and server limits.
- Support one physical deployment serving multiple logical servers by table prefix.

## Promptbook Engine Boundary

The Promptbook Engine is the framework-agnostic agent runtime. Agents Server uses it to parse book-language source, create model requirements, run agents, and resolve commitments.

Agents Server owns the web/API behavior around that engine:

- Authentication and authorization.
- Agent persistence and organization.
- Per-server routing and custom domains.
- Durable chat queues and workers.
- User memory, wallet, and file handling.
- Admin and management APIs.

Any compatible implementation MUST keep this boundary clear. Engine-level behavior can be delegated to the Promptbook Engine, but server-level contracts are defined by these specs.

## Runtime Components

Agents Server consists of these logical components:

- Middleware: resolves request context, content security policy, access restriction, custom-domain rewrites, legacy redirects, and visibility headers. See [Server Routing](server-routing.md).
- Web pages: render the homepage, agent pages, admin pages, system pages, documentation, and embedded views. See [User Interface Navigation](ui/navigation.md).
- API routes: expose public, authenticated, internal, OpenAI-compatible, and management endpoints. See [HTTP Routes](http-routes.md).
- Database layer: abstracts Supabase/PostgreSQL and local SQLite while preserving Supabase-shaped query behavior. See [Data Model](data-model.md).
- Agent collection: creates, updates, clones, soft-deletes, restores, imports, exports, and lists agents. See [Agents](agents.md).
- Chat runtime: converts requests into prompt context, executes agents, streams output, persists history, and records tool usage. See [Chat Runtime](chat-runtime.md).
- Durable chat worker system: claims queued jobs, writes runner message files, synchronizes finished/failed answers, and processes chat timeouts. See [User Chats](user-chats.md) and [Background Workers](operations/background-workers.md).
- Admin/configuration surface: manages metadata, users, API tokens, limits, styles, logs, servers, and backups. See [Admin](admin.md).

## Request Lifecycle

A normal request follows this lifecycle:

1. Middleware creates a request context from the host, IP address, cookies, API-token headers, server registry, metadata, and table prefix.
2. Middleware applies access restriction. Restricted HTML requests are rewritten to `/restricted`; restricted non-HTML requests receive `403`.
3. Middleware applies legacy agent redirects and custom-domain rewrites when appropriate.
4. The route handler or page resolves the current logical server and database table prefix.
5. The handler resolves authentication and authorization for the requested resource.
6. The handler performs database reads/writes, agent-source resolution, model execution, or background-worker actions.
7. The response applies cache, CORS, visibility, and security headers required by the route family.

## State Consistency

The server uses append-friendly and soft-delete-friendly state:

- Agents, folders, memories, wallet records, and many user resources use soft deletion.
- Agent updates preserve history snapshots.
- Durable chat jobs use explicit status transitions.
- Database migrations MUST remain backward compatible. See [Database Migrations](operations/database-migrations.md).
- Server-level configuration SHOULD be changed through metadata and server limits instead of code changes. See [Configuration](configuration.md).

## Compatibility Requirements

A replica is compatible when a user can:

- Configure a server instance.
- Create, organize, edit, clone, import, export, delete, and restore agents.
- Chat with agents through the web UI and OpenAI-compatible APIs.
- Use durable chat conversations and background workers.
- Use memory, wallet, files, feedback, images, and integrations.
- Administer users, API tokens, metadata, limits, styles, backups, and logs.
- Drive automation through `/api/v1`.

