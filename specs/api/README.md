# HTTP API

The Agents Server exposes its functionality over HTTP route handlers. This section documents every endpoint
group. All routes run **after** the [middleware](../architecture/multi-server.md), so they already operate
in the resolved server's [table-prefix scope](../architecture/database.md) and behind
[access control](../architecture/security-and-access.md).

## Conventions

- **Base**: routes are relative to the active server's public origin.
- **Two route namespaces**:
  - **Agent-scoped**: `/agents/:agentName/api/...` — operate on one agent (identified by `permanentId` or
    `agentName`).
  - **Global**: `/api/...` — server-wide or cross-agent.
- **Auth** (per group):
  - **Session cookie** (`sessionToken`) for browser/UI routes.
  - **Bearer `ptbk_...`** for the [management API](./management-api-v1.md) (`/api/v1/*`).
  - **Internal worker token** header (`x-user-chat-worker-token`) for `/api/internal/*`.
  - **Provider-style `Authorization`** for the [OpenAI-compatible](./openai-compatibility.md) API.
  - Some read routes are public (subject to server/agent visibility + IP restriction).
- **Errors**: JSON `{ "error": "message", "code"?: "...", "details"?: ... }` with a matching HTTP status
  (400 validation, 401 unauthorized, 403 forbidden, 404 not found, 500 server error). The management API uses
  a normalized `{ code, message }` error shape.
- **Idempotency**: message enqueue uses a client-supplied `clientMessageId`.
- **Private mode**: routes that would persist chat telemetry reject with 403 when
  [private mode](../architecture/security-and-access.md) is enabled.
- **CORS**: public/read and management routes set permissive or configured CORS
  (`MANAGEMENT_API_CORS_ORIGINS`).

## Endpoint groups

- [Agent directory & organization](./agent-directory.md) — list/search agents, folders, org, import/export
- [Agent chat](./agent-chat.md) — user chats, messages, streaming, jobs, drafts, feedback, profile, book
- [Timeouts](./agent-chat.md#timeouts) — scheduled wake-ups (also under `/agents/:name/api/timeouts`)
- [OpenAI-compatible API](./openai-compatibility.md) — `/api/openai/v1/*` and per-agent variants + OpenRouter
- [MCP](./mcp.md) — Model Context Protocol endpoint per agent
- [Management API v1](./management-api-v1.md) — `/api/v1/*` + `/api/api-tokens` + OpenAPI/Swagger
- [Auth API](./auth-api.md) — login, logout, change-password, Shibboleth
- [Admin API](./admin-api.md) — `/api/admin/*`
- [Integrations API](./integrations-api.md) — calendar OAuth, GitHub App, email, voice/TTS/STT, upload, S3,
  images, scrape, search, messages, push, wallet, memory, settings, spawn, federation
- [Misc/system API](./misc-api.md) — health, docs, openapi, robots, sitemap, embed.js, error reports, etc.

## Internal worker routes (not for external callers)

Authorized by the worker token, excluded from middleware, driven by a scheduler:

- `GET|POST /api/internal/user-chat-jobs/run` — claim & process one durable [chat job](../chat/execution-model.md).
- `GET|POST /api/internal/user-chat-timeouts/run` — fire due [timeouts](../chat/timeouts-and-scheduling.md).
- `/api/internal/agent-runner-limits` — runner limit checks.

See [Chat execution model](../chat/execution-model.md).
