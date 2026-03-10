[ ]

[✨🥇] Servers dashboard: spawn isolated servers from admin UI

-   *(@@@@ Written by agent)*
-   Implement a new “Servers” area in the administration UI where logged-in admin users can list and create isolated servers (Discord-like “servers”) running under the same Agents Server instance (one deployment, one DB, multiple table prefixes).
-   This is NOT federated servers: federated servers are about interoperability across separate servers/instances; the feature here is about spawning additional isolated servers within the same deployment via prefixes and the `SERVERS` configuration.
-   Allow any logged-in admin user to create a new server; users can manage servers they own, but must not be able to delete/modify ownership-critical settings of servers owned by other admins.

-   Administration UI
    -   Add new navigation item “Servers” in the admin dashboard.
    -   Servers list shows at minimum: server icon, server name, server identifier/slug/prefix, owner admin user, createdAt, last migration/version status @@@.
    -   From the list, allow: open/switch-to server @@@, view details, run “migrate/update” action @@@ (if manual), edit non-critical metadata (name, icon) for owned servers.
    -   Explicitly disallow deleting servers in UI for now (or only allow deleting own servers if we later add it); user requirement: “You cannot delete another server from another server but you can create a new one.”

-   Create server wizard
    -   Add a simple multi-step form/wizard to create a server.
    -   Required fields:
        -   server name
        -   server icon (upload or choose) @@@
        -   admin username + admin password for the new server (these credentials are for the spawned server’s internal admin account, not necessarily the creating user).
    -   Other basic stuff:
        -   initial settings (language, homepage settings, feature flags) @@@
    -   Validation:
        -   server identifier/slug must be unique and safe for prefix usage; auto-generate from name with override @@@.
        -   password policy @@@.

-   Spawning semantics (must match existing “servers” behavior)
    -   Spawning a server means:
        -   creating a new DB prefix/namespace for all tables used by Agents Server
        -   applying all migrations for that prefix (equivalent to provisioning a fresh server)
        -   registering the server into the runtime “servers list” (currently driven by environment variable `SERVERS`) so it becomes available like existing servers.
    -   The newly created server must behave identically to preconfigured servers (same routes, same auth model, same capabilities), just isolated by prefix.

-   Persistence and configuration model
    -   Introduce a persistent registry for servers created from UI (e.g., `Server` table in a global/non-prefixed schema or a dedicated “meta” prefix) containing:
        -   id, slug/identifier, dbPrefix, name, icon, ownerUserId, createdAt, updatedAt, status
        -   desired config subset that currently comes from `SERVERS` env var @@@
    -   At runtime, merge env-configured servers with DB-registered servers into a unified server list.
    -   Define precedence rules when a server exists in both env and DB @@@.

-   Migrations and auto-update mechanism
    -   Ensure that when the migration script runs, it migrates:
        -   all env-configured servers
        -   all DB-registered servers created from UI
    -   Add a mechanism to keep newly created servers updated (e.g., migration script enumerates server registry, or background job on boot) so they are upgraded along with the deployment.
    -   Define how “current migration version” is tracked per server/prefix and shown in UI @@@.

-   Security / permissions
    -   Only logged-in admin users can access Servers dashboard.
    -   Ownership rules:
        -   an admin can always create a server
        -   an admin can update basic metadata of servers they own
        -   an admin must not be able to delete or take over servers owned by others
    -   Audit log for server creation and edits @@@.

-   Ops / edge cases
    -   Handle failure during provisioning (partial migrations) with safe rollback or “failed” status + retry.
    -   Concurrency: prevent two creates with same slug/prefix.
    -   Decide whether “registering in env var `SERVERS`” is conceptual (DB-backed) vs literally editing env vars (not possible on Vercel at runtime). Implementation should reflect actual deployment constraints and document them in code/comments @@@.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥇] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥇] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥇] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)