# Application architecture

The Agents Server is a **Next.js App-Router** application. This document describes its request lifecycle and
the moving parts; the deep topics have their own specs (linked below).

## Entry points

Every server-side entry point is one of:

- **Page routes** — server-rendered UI (React server components). See [UI overview](../ui/overview.md).
- **Route handlers** — HTTP API endpoints (`GET`/`POST`/…). See [API](../api/README.md).
- **The global middleware** — runs before every matched request (below).
- **Internal worker routes** — token-authorized background endpoints under `/api/internal/*`, excluded from
  the middleware and driven by a scheduler/cron. See [Chat execution](../chat/execution-model.md).

## Request lifecycle

For a normal (non-static, non-`/api/internal`) request:

1. **Middleware** ([multi-server routing & access control](./multi-server.md)):
   - Issues a per-request Content-Security-Policy nonce and sets security headers.
   - Builds a **request context**: resolves the logical server for the request host (→ table prefix),
     loads server settings (allowed IPs, embedding, visibility), and evaluates authorization
     (session cookie / API token).
   - Enforces **access control** (IP allow-list + login/token gate) and applies visibility/embedding
     headers; may rewrite for custom-domain agents.
2. **Route handler / page** runs with the resolved table prefix in scope. Data access goes through the
   [database provisioning layer](./database.md), which prefixes table names for the active server.
3. **Response** carries the security/visibility headers assembled by the middleware.

The middleware matcher excludes static assets, `favicon.ico`, `robots.txt`, `/api/health`, and
`/api/internal/*` (those authorize themselves).

## Cross-cutting subsystems

- **Multi-tenancy** — one deployment/database hosts many logical servers keyed by domain. See
  [Multi-server model](./multi-server.md).
- **Persistence** — Supabase/PostgreSQL or SQLite, with per-server table prefixes and auto-migrations. See
  [Database](./database.md).
- **Configuration** — a `Metadata` key/value table (+ `ServerLimit` table) and environment variables. See
  [Configuration](./configuration.md).
- **Security & access** — sessions, roles, IP restriction, embedding, visibility, private mode, CSP. See
  [Security & access](./security-and-access.md).
- **Engine integration** — Book parsing/compilation and LLM execution tools. See
  [Promptbook Engine boundary](./promptbook-engine.md).
- **Durable chat engine** — background jobs, workers, runners, streaming. See [`chat/`](../chat/).

## Deployment targets

- **Hosted** — deployed to Vercel, backed by Supabase; many servers per project (mapped through the
  `_Server` registry). Vercel git/deploy metadata is exposed to the app via `NEXT_PUBLIC_VERCEL_*`.
- **Standalone VPS / local** — run via the `ptbk agents-server` CLI, optionally backed by SQLite, with a
  self-update mechanism and a raw-IP bootstrap flow. See [Self-hosting](../features/self-hosting.md).

## Background execution

Next.js request handlers schedule follow-up work with `after(...)` (e.g. triggering a chat worker after
enqueuing a message). Long-running background progress is owned by the durable **job/timeout** tables and
their internal worker routes rather than by in-request promises, so work survives request completion and
process restarts. See [Chat execution model](../chat/execution-model.md).

## Related specs

- [Multi-server model](./multi-server.md) · [Database](./database.md) · [Configuration](./configuration.md)
- [Security & access](./security-and-access.md) · [Promptbook Engine boundary](./promptbook-engine.md)
- [API overview](../api/README.md) · [UI overview](../ui/overview.md)
