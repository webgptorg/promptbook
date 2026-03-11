[ ]

[🗄️🌐] Normalize servers env naming, migration filtering, and Vercel domains sync

-   *(@@@@ Written by agent)*
-   Problem: server environments are currently identified via env value `SERVERS` in DB / code, which is inconsistent with other naming conventions and makes automation and filtering harder.
-   Change: rename environment key/value from `SERVERS` to `_Server` across the system (DB + code), keeping backwards compatibility for existing records and deployments.
-   Add ability to filter/select migrations by environment category as whole group:
    -   `production` (all production servers)
    -   `preview` (all preview servers)
    -   existing ability to target individual servers must remain.
-   Update/sync script: propagate mapping from `_Server` records to Vercel domains (so that Vercel domain configuration reflects servers known in DB).
-   Backward compatibility:
    -   Existing DB rows with `SERVERS` must still work during rollout.
    -   Provide a one-time migration to rewrite to `_Server` (and optionally keep alias support for `SERVERS` for @@@ days).
-   Safety:
    -   Add dry-run mode for the sync script.
    -   Add idempotency so repeated runs do not create duplicates in Vercel.
    -   Add logging suitable for CI (structured output).
-   Acceptance criteria:
    -   Running migrations filtered by `production` runs only production migrations.
    -   Running migrations filtered by `preview` runs only preview migrations.
    -   `_Server` is the single source of truth in DB and code.
    -   Sync script updates Vercel domains so that all `_Server` records are represented as domains, and removed servers are either deleted or flagged (decide: @@@).
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with migration tooling / scripts in @@@ (search for migrations runner and filtering logic)
-   You are working with Vercel domain sync script in @@@ (search for vercel/domains script)
-   Update docs / env reference in @@@
-   Add the changes into the [changelog](changelog/_current-preversion.md)
-   Open questions:
    -   Where exactly is `SERVERS` stored in DB (table + column)? @@@
    -   Is `_Server` a literal string value, a prefix convention, or a column name? @@@
    -   What is the source of truth for production vs preview classification (field, naming convention, domain pattern)? @@@
    -   For removed servers, should we delete Vercel domains or just warn? @@@
