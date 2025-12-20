[x]

[✨🥏] Identify agents via random ids not `agentName` derrived from the first line of `agentSource`

-   Add base 58 based unique identifiers to each agent in the Agents Server
-   In the `agentSource` keep generating random names for agents like "Noah Green" or "Sophia Brown" but also add a permanent unique identifier to each agent, such as a base58-encoded string (e.g., "3mJr7AoUXx2Wqd").
-   Also keep `agentName` derrived from the first line of `agentSource` for backward compatibility and easy human readability.
-   When accessing agents via URL or API, support both ways:
    -   By `agentName` derrived from the first line of `agentSource` e.g., `/agents/noah-green`
    -   By permanent unique identifier e.g., `/agents/3mJr7AoUXx2Wqd`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🥏] After new agent is created, redirect to agent `permanentId` not `agentName`

-   When a new agent is created in the Agents Server, after creation redirect the user not to the URL with the `agentName` derrived from the first line of `agentSource` but to the URL with the permanent unique identifier.
-   Keep supporting both ways of accessing agents:
    -   By `agentName` derrived from the first line of `agentSource` e.g., `/agents/noah-green`
    -   By permanent unique identifier e.g., `/agents/3mJr7AoUXx2Wqd`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🥏] When listing agents, use `permanentId` not `agentName`

-   When listing agents in the Agents Server, use the permanent unique identifier for links and references instead of the `agentName` derrived from the first line of `agentSource`.
-   It should be used in all places where agents are listed, such as:
    -   Home page `/` and agent page `/agents`
    -   Federated agents API
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🥏] Agent should have canonical url based on `permanentId`

-   Agents have both `agentName` and `permanentId`
-   Both can be used to access the agent:
    -   http://localhost:4440/agents/olga-stetinova
    -   http://localhost:4440/agents/3mJr7AoUXx2Wqd
-   But on every agent page, add `<link rel="canonical" href="...">` tag in the `<head>` section that points to the URL with `permanentId`, so search engines always see the canonical URL based on `permanentId`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🥏] Permanent ID of the agent should live totally outside of the `agentSource`

-   Currently when the new agent is created his permanent id is put both in `Agent` table in column `permanentId` and also inside the `agentSource` as `META ID` commitment
-   There should be no such thing as `META ID` inside the `agentSource`
-   Agent source should be totally agnostic of the permanent id, and permanent id should live only in the database layer
-   Agent source should be 100% portable between different Agents Server instances without carrying any potentially conflicting information about permanent ids
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🥏] Identify agents in `AgentHistory` by `permanentId` (not `agentName`)

-   In the table `Agent` agents have both `agentName` and `permanentId` and their primaty identifier is `permanentId`
-   In the table `AgentHistory` currently agents are identified by `agentName`, change it to use `permanentId` instead.
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
    -   When using table names in supabase queries, use the `$getTableName` utility function to get the correct table name with prefix, for example: `await supabase.from(await $getTableName('Agent')).select('...')`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🥏] brr

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
