# Management API

The management API is the stable external automation API under `/api/v1`. It is intended for development tools, tests, integrations, and external clients that manage Agents Server content.

## Base Contract

All management API routes MUST:

- Require `Authorization: Bearer ptbk_<token>`.
- Reject browser-session-only authentication.
- Resolve the token to a non-revoked `ApiTokens` row and owner user.
- Return `Cache-Control: no-store, max-age=0`.
- Include `X-Request-Id`, using the incoming header when present or generating a UUID.
- Return structured JSON errors.

## CORS

Allowed origins come from `MANAGEMENT_API_CORS_ORIGINS` metadata or environment value. Default is `*`.

If the value is `*`, responses use:

```http
Access-Control-Allow-Origin: *
```

Otherwise, the request `Origin` must exactly match one configured origin, and responses MUST include `Vary: Origin`.

Allowed methods:

```text
GET, POST, PATCH, DELETE, OPTIONS
```

Allowed headers:

```text
Content-Type, Authorization, X-Request-Id
```

## Error Envelope

Errors use:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Human readable message",
    "details": {},
    "requestId": "uuid"
  }
}
```

Defined codes:

- `authentication_required`
- `forbidden`
- `invalid_request`
- `validation_error`
- `not_found`
- `conflict`
- `server_error`
- `token_owner_missing`

`details` is optional. `requestId` SHOULD be present when available.

## Identity Resolution

Legacy API tokens with no `userId` MAY be assigned to an owner only when one can be inferred safely:

- exactly one existing user exists, or
- exactly one admin user exists, or
- no users exist and `ADMIN_PASSWORD` allows creating a synthetic admin owner.

If the owner cannot be inferred, the API MUST return `403 token_owner_missing`.

## Pagination

Paginated list responses use:

- `page`: one-based, default `1`.
- `limit`: default `20`, minimum `1`, maximum `100`.
- `total`: total matching items.
- `items` or resource-specific collection key.

## Agent Schemas

Agent visibility values:

- `PRIVATE`
- `UNLISTED`
- `PUBLIC`

Agent summary:

```json
{
  "id": 1,
  "agentName": "Example",
  "permanentId": "abc",
  "displayName": "Example",
  "description": "Short description",
  "visibility": "UNLISTED",
  "folderId": null,
  "sortOrder": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "links": {
    "profileUrl": "https://server/agents/abc",
    "chatUrl": "https://server/agents/abc/chat",
    "integrationUrl": "https://server/agents/abc/integration"
  }
}
```

Agent detail adds:

- `source`
- `profile`

## Folder Schema

Folder:

```json
{
  "id": 1,
  "name": "Folder",
  "parentId": null,
  "sortOrder": 0,
  "icon": null,
  "color": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

## `GET /api/v1/instance`

Returns instance metadata:

- `baseUrl`
- `serverName`
- `serverVersion`
- `managementApiBasePath`: `/api/v1`
- `openApiUrl`
- `swaggerUrl`
- `supportedFeatures`

## `GET /api/v1/me`

Returns the authenticated API identity:

- `userId`
- `username`
- `email`
- `plan`
- `limits`
- `createdAt`
- `apiKey`: id, note, and createdAt

## `GET /api/v1/agents`

Lists non-deleted agents owned by the API-token user. Private agents are included for their owner.

Query:

- `page`
- `limit`
- `q`
- `sort`

Allowed sort values:

- `relevance:desc`
- `createdAt:asc`
- `createdAt:desc`
- `updatedAt:asc`
- `updatedAt:desc`
- `name:asc`
- `name:desc`

Default sort is `updatedAt:desc`.

## `POST /api/v1/agents`

Creates an owned agent.

Request:

```json
{
  "source": "Agent source",
  "folderId": null,
  "visibility": "UNLISTED",
  "sortOrder": 0
}
```

Rules:

- `source` length is `1..120000`.
- `folderId` must belong to the token owner when provided.
- `sortOrder` defaults to the next position in the target folder.
- Response status is `201`.

## `GET /api/v1/agents/<agentId>`

Returns owned agent detail. Deleted or foreign agents return `404`.

## `PATCH /api/v1/agents/<agentId>`

Updates at least one of:

- `name`
- `source`
- `folderId`
- `visibility`
- `sortOrder`

Rules:

- `source` length is `1..120000` when supplied.
- `name`, `source`, and `visibility` updates modify book source through safe transformations.
- `folderId` must belong to the owner.
- If folder changes and no `sortOrder` is supplied, append to the target folder.
- Ambiguous agent lookup returns `409 conflict`.

## `DELETE /api/v1/agents/<agentId>`

Soft-deletes an owned agent and returns a success response.

## `GET /api/v1/folders`

Lists active folders owned by the API-token user, ordered by `sortOrder`.

## `POST /api/v1/folders`

Creates an owned folder.

Request:

```json
{
  "name": "Folder",
  "parentId": null,
  "sortOrder": 0,
  "icon": null,
  "color": null
}
```

Rules:

- `name` is required and cannot contain `/`.
- `parentId` must belong to the owner when supplied.
- `icon` and `color` must pass server parsers.
- `sortOrder` defaults to the next sibling position.
- Name conflicts return `409`.

## `PATCH /api/v1/folders/<folderId>`

Updates at least one of:

- `name`
- `parentId`
- `sortOrder`
- `icon`
- `color`

Rules:

- The folder must belong to the owner and be active.
- Parent folder must belong to the owner.
- Moving a folder into itself or a descendant is forbidden.
- Name conflicts return `409`.

## `DELETE /api/v1/folders/<folderId>`

Soft-deletes an owned folder, descendant folders, and owned agents in that subtree.

## `POST /api/v1/folders/<folderId>/agents/<agentId>`

Moves an owned agent to an owned folder. The response returns the updated agent summary.

## OpenAPI and Swagger

`/openapi.json` MUST describe the management API routes. `/swagger` MUST render interactive documentation for the same schema.

