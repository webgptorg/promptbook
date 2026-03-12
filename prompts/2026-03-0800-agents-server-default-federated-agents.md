[ ]

[🌐🧬] Default federated agents cloned from Core server

-   Each Agents Server should ship with pre-created example agents to showcase Promptbook capabilities.
-   There is a core server special case of federated server which contains special agent, in folder `default` will be canonical boilerplate agents.
-   When a new server registers to Core (or otherwise completes federation handshake), it should ensure that all default agents from Core boilerplate exist locally; if missing, create them by cloning.
-   On subsequent registrations/sync events, if Core adds new default boilerplate agents, they should also be cloned locally (only missing ones; do not overwrite existing local edits).
-   Agent identity/matching must use normalized name (same normalization rules as elsewhere in Promptbook) and be stable across servers.
-   The clone operation must not:
    -   overwrite an existing local agent with same normalized name
    -   delete local agents when Core removes/renames boilerplate agents
    -   modify local agent if user edited it
-   Make the sync idempotent and safe to run concurrently (e.g. on multiple server startup nodes): use DB constraints/transactions.
-   Error handling:
    -   if Core is unreachable, just do not clone missing agents for now, but do not fail, just error to console
-   You are working with the [Agents Server](apps/agents-server)
-   You can (but not necessarily) create a database migration if needed
-   Add the changes into the [changelog](changelog/_current-preversion.md)
