# Server Routing

Server routing defines how one deployment maps incoming HTTP requests to a logical Agents Server, database table prefix, agent, and final route.

## Logical Servers

A deployment MAY host multiple logical servers. Each logical server has:

- `id`: stable server id.
- `name`: human-readable server name.
- `environment`: one of `LTS`, `PREVIEW`, `PRODUCTION`, or `LIVE`.
- `domain`: canonical host or URL.
- `tablePrefix`: database prefix for per-server tables.
- `createdAt` and `updatedAt` timestamps.

The global `_Server` table stores registered servers. It is not prefixed. Environment variable `SERVERS` MAY define virtual server records, but database records are authoritative when present.

If `SUPABASE_TABLE_PREFIX` is missing and a registered server is derived from a domain, the table prefix is derived from the normalized domain as `server_<normalized_domain>_`.

## Server Resolution

For each request, the server resolution algorithm MUST:

1. Determine the host from the request.
2. Honor the internal request header `x-promptbook-server` when set by custom-domain routing.
3. Load registered servers from `_Server` and `SERVERS`.
4. In local SQLite mode, use a local fallback server for development hosts and registered `SERVERS` for configured hosts.
5. In Supabase/PostgreSQL mode, use a local fallback for local development; otherwise match the request host to a registered server.
6. Return a logical server with `id`, `publicUrl`, and `tablePrefix`.

If no registered server matches a production host, the request MUST fail instead of silently using the wrong table prefix.

## Public URL Rules

The public URL for a logical server uses:

- `http` for localhost and raw IP development hosts.
- `https` for normal domains.
- `NEXT_PUBLIC_SITE_URL` when explicitly configured for fallback contexts.

## Root and Raw-IP Behavior

The homepage at `/` and `/agents` resolves the logical server and displays agents when possible.

When the host is a raw IP address:

- If there are no registered servers, a global admin is redirected to `/admin/servers?setup=1`.
- If there are no registered servers and the current user is not a global admin, the server shows a forbidden page.
- If multiple registered servers exist, the server shows a domain chooser.
- If exactly one registered server exists, the server redirects to that server's canonical public URL.

## Middleware Scope

Middleware applies to application routes except static framework assets, image optimizer assets, favicon/logo/font files, `robots.txt`, `/api/health`, and `/api/internal`.

Middleware MUST:

- Generate a per-request content-security-policy nonce.
- Attach CSP request/response headers.
- Resolve request IP, host, server registry, metadata settings, API-token authorization, and session-cookie presence.
- Enforce restricted-access mode.
- Rewrite custom-domain requests.
- Redirect legacy agent routes.
- Apply embedding and robots headers.

## Restricted Access

Restricted access is controlled by `RESTRICT_IP`. A request is restricted when:

- The client IP is not allowed.
- The user is not logged in through a valid session cookie.
- The request is not authorized by a valid API token.

Restricted requests MAY still access:

- `/`
- `/agents`
- `/api/agents`
- `/api/federated-agents`
- `/api/search`
- `/api/auth`
- `/restricted`
- `/docs`
- `/openapi.json`
- `/swagger`
- `/manifest.webmanifest`
- `/sw.js`
- `/system/utilities/mocked-chats/view`

Restricted HTML requests MUST rewrite to `/restricted`. Restricted non-HTML requests MUST receive plain `403`. Restricted `OPTIONS` requests MUST receive permissive CORS headers.

## Legacy Agent Redirects

Requests whose first path segment is an agent identifier MUST redirect from `/<agentName>` to `/agents/<agentName>` unless the first segment is a reserved application segment or starts with `.`.

## Custom Domains

Custom-domain routing maps a host directly to an agent.

An agent can claim a custom domain through book metadata such as `META DOMAIN` or `META LINK`. The router MUST compare normalized host candidates, including plain host, `https://<host>`, and `http://<host>`.

Custom-domain lookup MUST:

- Skip internal API routes.
- Skip loopback hosts.
- Skip private-network hosts outside production.
- Skip Vercel preview hosts ending in `.vercel.app` or `.vercel.sh`.
- Search registered servers' prefixed `Agent` tables.
- Resolve inherited/imported metadata before matching.
- Rewrite the request to the matching agent route.
- Set `x-promptbook-server` to the owning server domain.

Lookup SHOULD be cached briefly and time-bounded to avoid slowing unrelated requests.

## Visibility Headers

Server visibility comes from `SERVER_VISIBILITY`, with an environment variable override taking precedence over metadata.

If server visibility is not public, HTML responses MUST include:

```http
X-Robots-Tag: noindex, nofollow
```

If the server is public:

- Public agent profile pages may be indexable.
- Private and unlisted agent pages MUST be noindexed.
- Agent subpages such as chat, book, history, or integration MUST be noindexed.

## Embedding Headers

`IS_EMBEDDING_ALLOWED` controls whether the server allows iframe embedding. Middleware MUST apply the embedding decision consistently to HTML responses.

## CORS

Public chat and public listing routes generally allow cross-origin access where needed. Management API CORS is governed separately by [Management API](management-api.md).

