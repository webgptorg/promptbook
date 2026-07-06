# Agents Server Specs

This folder is the functional specification for Promptbook Agents Server. It describes the observable behavior, data contracts, routing rules, and operational invariants needed to implement a compatible Agents Server without reading the source code.

The specs are organized by responsibility. Root-level specs describe the core concepts. Subfolders contain lower-level operational and user-interface details.

## Scope

Agents Server is the web and API application that stores agents, serves the user interface, exposes public and authenticated APIs, runs chats, persists durable conversations, and manages one or more server instances. It uses the Promptbook Engine for book-language parsing and agent execution, but the server-specific behavior is defined here.

These specs intentionally omit orphan or unused code paths. They document the functionality that is part of the current Agents Server behavior.

## Core Specs

- [Architecture](architecture.md) defines the major components and request lifecycle.
- [Server Routing](server-routing.md) defines host resolution, table prefixes, custom domains, middleware, and visibility behavior.
- [Authentication](authentication.md) defines sessions, users, API tokens, worker tokens, and authorization boundaries.
- [Data Model](data-model.md) defines database namespaces, tables, and persistence invariants.
- [Configuration](configuration.md) defines environment variables, metadata, and server limits.
- [Agents](agents.md) defines agent identity, lifecycle, visibility, folders, import/export, federation, and preparation.
- [Book Language and Editing](book-language-and-editing.md) defines server handling of agent source, inheritance, history, diagnostics, and model requirements.
- [Chat Runtime](chat-runtime.md) defines stateless chat, OpenAI-compatible chat, streaming, feedback, attachments, and runtime tools.
- [User Chats](user-chats.md) defines durable chats, queued jobs, streaming snapshots, local/external runners, and chat timeouts.
- [Management API](management-api.md) defines the stable `/api/v1` external API.
- [HTTP Routes](http-routes.md) gives a route inventory and points each route family to its detailed spec.
- [User Data](user-data.md) defines memory, wallet records, user settings, files, push subscriptions, and share-target payloads.
- [Admin](admin.md) defines administrative surfaces and administrator-only behavior.
- [Integrations](integrations.md) defines third-party and protocol integrations.

## Detailed Specs

- [Database Migrations](operations/database-migrations.md) defines migration, prefixing, and local SQLite behavior.
- [Background Workers](operations/background-workers.md) defines internal worker contracts and queue processing.
- [User Interface Navigation](ui/navigation.md) defines the application navigation model and major pages.

## Replication Rules

A compatible implementation MUST preserve:

- The same public URL and route semantics defined in [HTTP Routes](http-routes.md).
- The same authentication and authorization boundaries defined in [Authentication](authentication.md).
- The same database records and state transitions defined in [Data Model](data-model.md), [Agents](agents.md), and [User Chats](user-chats.md).
- The same chat streaming surface, including markdown text deltas and tool-call frames, defined in [Chat Runtime](chat-runtime.md).
- The same management API request, response, error, pagination, CORS, and ownership behavior defined in [Management API](management-api.md).

An implementation MAY use different internal code structure or libraries if these externally visible contracts remain compatible.

