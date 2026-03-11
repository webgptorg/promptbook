[x] ~$0.00 40 minutes by OpenAI Codex `gpt-5.4`

[🗄️🌐] Change env variable `SERVERS` to `_Server` database table

-   Problem: server environments are currently identified via env value `SERVERS` in DB / code, which is not scalable or flexible for managing lot of servers and their associated Vercel domains. For every change we need to update env vars and redeploy.
-   Change env variable `SERVERS` to `_Server` database table across the system
-   `_Server` table schema:
    -   `id` (primary key, auto-increment)
    -   `name` (string, unique) - e.g. "production-eu-west", "preview-1", etc.
    -   `environment` (enum: "PRODUCTION", "PREVIEW") - for grouping servers
    -   `domain` (string) - the Vercel domain associated with this server
    -   `tablePrefix` (string) - prefix for DB tables
    -   `createdAt`, `updatedAt` timestamps
-   Add ability to filter/select migrations by environment category as whole group:
    -   `production` (all production servers)
    -   `preview` (all preview servers)
    -   existing ability to target individual servers must remain.
-   Update/sync script: propagate mapping from `_Server` records to Vercel domains (so that Vercel domain configuration reflects servers known in DB).
    -   Register this script in `terminals.json`
-   Safety:
    -   Add dry-run mode for the sync script.
    -   Add logging suitable for CI (structured output).
-   Acceptance criteria:
    -   Running migrations filtered by `production` runs only production migrations.
    -   Running migrations filtered by `preview` runs only preview migrations.
    -   `_Server` is the single source of truth in DB and code.
    -   Sync script updates Vercel domains so that all `_Server` records are represented as domains, and removed servers are either deleted or flagged.
-   You are working with the [Agents Server](apps/agents-server)
-   You don’t need to keep backward compatibility
-   You are working with migration tooling and scripts
-   You are working with Vercel API for domain management
-   Add the changes into the [changelog](changelog/_current-preversion.md)

