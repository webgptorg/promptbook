[x]

[✨📗] Change deleting logic of agents to mark deleted agents by timestamp

-   Add column `deletedAt` into `Agent` table
-   Update the logic of `/recycle-bin` which can restore deleted agents
    -   Deleting an agent sets the `deletedAt` timestamp to current time
    -   Restoring an agent sets the `deletedAt` timestamp to `NULL`
-   Deleting agents does not interact with table `AgentHistory` at all
-   Only admin users can delete and restore deleted agents
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨📗] Add button for deleting agent in the agent menu

-   When the agent is deleted, user still see the agent profile page but with a banner "This agent has been deleted. You can restore it from the Recycle Bin."
    -   Same is valid for agent sub-pages like `/agents/[agentName]/book` or `/agents/[agentName]/chat`
-   Anonymous users do not see the deleted agents at all
-   Agent menu is in file `/apps/agents-server/src/app/agents/[agentName]/AgentOptionsMenu.tsx`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨📗] bar

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨📗] bar

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
