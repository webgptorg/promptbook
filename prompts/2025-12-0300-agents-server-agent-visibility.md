[ ]

[✨🚀] Add `visibility` to `Agent` table

-   Add `visibility` column to the `Agent` table in the database
    -   `visibility` can have values `PUBLIC`, `PRIVATE`
    -   By default `visibility` is `PRIVATE`
-   In the Agents Server application, only show `PUBLIC` agents to unauthenticated users
-   Authenticated users can see both `PUBLIC` and `PRIVATE` agents
-   Admin users can see and manage both `PUBLIC` and `PRIVATE` agents and also change their visibility
-   The `visibility` feature is outside of `agentSource` scope, so it does not affect the `agentSource` and isnt derrived from it
-   Do not expose private agents through federated servers API
-   Add metadata option `DEFAULT_AGENT_VISIBILITY` which is by default `PRIVATE` to set the default visibility for new agents
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🚀] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🚀] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🚀] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
