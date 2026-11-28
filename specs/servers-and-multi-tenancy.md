# Servers and Multi-tenancy

One Agents Server deployment can host **many server instances** (tenants). Each instance has its own domain, its own namespaced tables in the shared database, and its own [configuration metadata](configuration.md). A single-instance deployment is the degenerate case of the same model.

## Server registry

The registry of instances lives in the **global, unprefixed** table `_Server`:

| Column        | Meaning                                                            |
| ------------- | ------------------------------------------------------------------ |
| `id`          | Numeric id.                                                        |
| `name`        | Unique server name (conventionally equal to the domain).           |
| `environment` | `LTS` \| `PREVIEW` \| `PRODUCTION` \| `LIVE` (operational tiering). |
| `domain`      | Unique hostname served by this instance.                           |
| `tablePrefix` | Unique table-name prefix, format `server_<PascalCaseName>_`.       |

Alternatively (standalone/CLI deployments) the registry can be provided by the **`SERVERS` environment variable** — a comma-separated domain list. Each domain becomes a virtual registry row whose prefix is `SUPABASE_TABLE_PREFIX` when set, otherwise derived deterministically from the domain: lowercase `a-z0-9-` identifier → PascalCase → `server_<PascalCase>_`.

When **no** servers are registered at all, the deployment is single-tenant and every request uses the `SUPABASE_TABLE_PREFIX` env value (possibly empty).

## Table prefixes

Every instance-scoped table name is `<tablePrefix><TableName>` (these specs write `prefix_` as the placeholder). All reads and writes MUST resolve the prefix **per request** from the resolved server instance. The `_Server` table itself (and migration bookkeeping, see [Migrations](operations/migrations.md)) is global.

## Host resolution (per request)

Given the request `Host` header (normalized: lowercased, port and IPv6 brackets stripped):

1. If the host matches a registered server's domain → that server (and its prefix) is current.
2. Otherwise, when registered servers exist, attempt [custom-domain resolution](#custom-domains). A match forwards the owning server via the `x-promptbook-server` request header and rewrites the request to the matched agent's path.
3. Local-development hosts (localhost, loopback, private-network in non-production) and deployments without a registry fall back to `SUPABASE_TABLE_PREFIX`.
4. A host that matches nothing on a multi-server deployment MUST NOT silently fall back to another tenant's data (requests either fail or use the neutral fallback prefix, never a different registered server's prefix).

The resolved instance also fixes the **public URL** used when generating absolute links (server domain, `https` except localhost-style hosts).

## Custom domains

An agent may claim a custom domain in its book via `META DOMAIN <domain>` (or a matching `META LINK`). Resolution of an unknown host:

-   scans registered servers' `Agent` rows for a profile whose `meta.domain` (or link) matches the normalized host (`www.` and scheme variants considered),
-   result: `{ server, agentName }` — requests to that host are **rewritten** to `/<agentName>` on the owning instance, so the whole agent app (profile, chat, APIs) is served under the vanity domain.

Operational constraints (reference implementation): resolution runs in edge middleware with a 1.5 s timeout, a 120 s in-memory TTL cache (negative results cached too), in-flight deduplication per host, and is skipped for loopback/private hosts, platform hosts (`*.vercel.app`, `*.vercel.sh`), and `/api/internal/*` paths.

## Server visibility

Each instance declares a global crawl/index mode via the `SERVER_VISIBILITY` metadata key (fallback: `SERVER_VISIBILITY` env; default `PRIVATE`):

-   **`PRIVATE`** — every HTML response carries `X-Robots-Tag: noindex, nofollow`; the sitemap is empty and robots discourage crawling.
-   **`PUBLIC`** — indexing enabled, but only selectively:
    -   agent **profile** pages of `PUBLIC` agents are indexable;
    -   profile pages of non-public agents and **all agent subpages** (chat, book, …) still get `noindex, nofollow`;
    -   `/sitemap.xml` lists public agents' profile URLs.

## Embedding allowance

The per-instance boolean `IS_EMBEDDING_ALLOWED` (metadata) controls whether embeddable routes may be framed by other sites; when allowed, the middleware appends the appropriate `frame-ancestors` CSP directive on top of the strict base policy. See [Embedding and PWA](ui/embedding-and-pwa.md).

## IP restriction

Per-instance `RESTRICT_IP` metadata (comma-separated IPs/CIDRs) gates all non-exempt traffic as specified in [Users and authentication](users-and-authentication.md#restricted-access).

## Administration

-   `/admin/servers` (+ `GET/POST/PATCH/DELETE /api/admin/servers[...]`) lets the **environment admin** manage `_Server` rows, run migrations for one instance (`POST /api/admin/servers/:serverId/migrate`), and inspect the active instance (`/api/admin/servers/active`).
-   Creating an instance requires: DNS/hosting for the domain, a `_Server` row (unique name/domain/prefix), and a [migration run](operations/migrations.md) to materialize its tables. New instances SHOULD start with `SERVER_VISIBILITY=PRIVATE`.
