[ ]

[🧩🗝️] OpenAPI management endpoints for Agents Server

-   *(@@@@ Written by agent)*
-   Each Agents Server instance must expose a working OpenAPI (Swagger) specification and management API endpoints for CRUD + organization of agents (and selected related resources), intended for building alternative clients / integrations.
-   This is NOT a replacement for OpenAI-compatible chat/completions routes; those remain the way to chat. This API is for management (create/edit/delete agents, list agents, access links, user metadata, etc.).
-   Authentication must reuse the same API keys mechanism already used for the OpenAI-compatible route (identify the user/tenant by API key); do not introduce a new auth scheme unless necessary.
-   Expose OpenAPI spec at `@@@` (prefer `/openapi.json`) and interactive docs at `@@@` (prefer `/docs` with Swagger UI), both on every instance.
-   Provide stable base path prefix for the management API, e.g. `@@@` (prefer `/api/v1`), separated from OpenAI-compatible routes.

-   Define and implement minimum endpoint set (first release):
    -   Agents
        -   `GET /api/v1/agents` list agents visible to the API key owner (support pagination, search `q`, sort)
        -   `POST /api/v1/agents` create agent
        -   `GET /api/v1/agents/{agentId}` get agent detail (including public profile link + chat link)
        -   `PATCH /api/v1/agents/{agentId}` update agent fields
        -   `DELETE /api/v1/agents/{agentId}` delete agent
        -   `POST /api/v1/agents/{agentId}:duplicate` duplicate an agent
        -   `POST /api/v1/agents/{agentId}:publish` and `POST /api/v1/agents/{agentId}:unpublish` OR a single `PATCH` field `visibility=private|unlisted|public` (final decision @@@)
    -   Folders / organization (if Agents Server supports folders already):
        -   `GET /api/v1/folders`
        -   `POST /api/v1/folders`
        -   `PATCH /api/v1/folders/{folderId}`
        -   `DELETE /api/v1/folders/{folderId}`
        -   `POST /api/v1/folders/{folderId}/agents/{agentId}` add/move agent to folder (exact semantics @@@)
    -   User / instance metadata
        -   `GET /api/v1/me` returns identity derived from API key (userId, email if available, plan/limits if available, createdAt)
        -   `GET /api/v1/instance` returns instance metadata (server version, base URL, supported features)

-   The OpenAPI schema must:
    -   Be generated from the code (or single source of truth) to avoid divergence.
    -   Include authentication scheme description (API key header name `@@@` and example).
    -   Include concrete request/response JSON schemas with examples.
    -   Include error model (at least `code`, `message`, `details?`, `requestId?`).

-   Backward/forward compatibility:
    -   Version the management API (`/api/v1`).
    -   Keep OpenAI-compatible routes unchanged.
    -   Document deprecations in advance (policy @@@).

-   Security & permissions:
    -   Ensure API key can only manage resources owned by the key owner/tenant.
    -   Rate limiting aligned with current API key limits (or define separate limits @@@).
    -   CORS: allow configuring origins for browser-based alternative clients (defaults @@@).
    -   Avoid leaking private agent source or user PII unless explicitly requested/authorized (fields and defaults @@@).

-   Implementation notes / project touchpoints:
    -   You are working with the [Agents Server](apps/agents-server)
    -   Identify where OpenAI-compatible auth is implemented and reuse it for these routes (@@@ file locations once verified)
    -   Add OpenAPI generation + swagger UI integration to the server runtime (@@@ approach / library)
    -   Add the changes into the [changelog](changelog/_current-preversion.md)

-   Acceptance criteria:
    -   `curl -H "@@@: <apiKey>" <baseUrl>/openapi.json` returns valid OpenAPI 3.x JSON for the instance.
    -   `/docs` renders interactive docs with all endpoints, secured by API key.
    -   A third-party client can: create agent, update its name/source, list agents, delete agent, and fetch its share/chat links.
    -   OpenAPI spec matches runtime behavior (basic contract tests / snapshot tests @@@).
