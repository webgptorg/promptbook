# Multi-server model

A single deployment and a single database can host **many independent logical Agents Servers**, each with
its own name, domain, agents, users, and settings. Isolation is achieved by **table prefixing**: every
logical server owns a distinct prefix, and the middleware chooses the prefix per request based on the host.

## The `_Server` registry

One **global, unprefixed** table, `_Server`, is the source of truth for routing and migration targeting.

| Column | Meaning |
|---|---|
| `id` | Numeric id |
| `name` | Stable unique server name |
| `environment` | One of `LTS`, `PREVIEW`, `PRODUCTION`, `LIVE` (a PostgreSQL enum `_ServerEnvironment`) |
| `domain` | Public domain assigned to the server (unique) |
| `tablePrefix` | Prefix for this server's tables, e.g. `server_Core_` (unique) |
| `createdAt` / `updatedAt` | Timestamps |

`name`, `domain`, and `tablePrefix` are each unique. Rows are seeded for the fleet (e.g.
`core.ptbk.io → server_Core_`, `pavol-hejny.ptbk.io → server_PavolHejny_`, …). The `environment` governs
which servers a migration run targets — see [Database](./database.md).

## Per-request routing (middleware)

For each request the middleware resolves routing as follows:

1. Read the request `host`.
2. If registered servers exist and the host matches a `_Server.domain`, use that row's `tablePrefix`.
3. Otherwise, if the host is a **custom domain** bound to a single agent, resolve it (with a short timeout
   and a host-keyed TTL cache) and use the owning server's prefix, rewriting the request to that agent. See
   [custom domains](#custom-domains).
4. Otherwise fall back to the configured default prefix (`SUPABASE_TABLE_PREFIX`, often empty for local/dev).

The resolved value is `tablePrefixForRequest`. Whether the request may query server tables at all
(`canQueryServerTables`) depends on a Supabase client being available and a prefix being resolvable.

Downstream, [`$getTableName('Agent')`](./database.md) returns `"<tablePrefix>Agent"` for the active server,
so all data access is automatically scoped to the correct tenant.

Hosts that are loopback, private-network (in dev), or platform hosts (`*.vercel.app`, `*.vercel.sh`) skip
the expensive custom-domain scan, as do `/api/internal/*` requests.

## Custom domains

An agent may declare a canonical domain (`META DOMAIN`). When a request arrives on such a domain, the
middleware maps the host to that agent and rewrites the request so the domain serves that agent directly.
Resolution is cached per host (TTL ~2 min, including negative results) and bounded by a strict timeout so
edge requests never block on inheritance/import scans.

## Server identity & public URL

The active server's identity (name, public URL, table prefix, environment) is provided to the app through a
server-context accessor (`$provideServer`). The public site URL defaults to `NEXT_PUBLIC_SITE_URL` but is
overridden by the matched `_Server` domain when routing resolves through the registry. Branding (name,
logo, description, language) comes from that server's [`Metadata`](./configuration.md).

## Environments and the fleet

- `PREVIEW` — preview/staging servers; receive migrations first.
- `PRODUCTION` / `LIVE` / `LTS` — stable servers.

Because production and preview share one physical database, [migrations must be backward compatible](./database.md):
older server versions must keep working after the schema is migrated by a newer preview deployment.

## Related specs

- [Database](./database.md) — prefixing, backends, migrations
- [Configuration](./configuration.md) — per-server `Metadata`
- [Security & access](./security-and-access.md) — IP restriction, visibility, embedding
- [Server management (admin)](../features/admin.md) · [`_Server` in the data model](../data-model/README.md)
