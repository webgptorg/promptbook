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

[x]

[✨📗] Update behavior of deleted agent

-   When the agent is deleted, user still see the agent profile page but with a banner "This agent has been deleted. You can restore it from the Recycle Bin."
    -   Same is valid for agent sub-pages like `/agents/[agentName]/book` or `/agents/[agentName]/chat`
-   Do not allow chatting with deleted agents, show banner "This agent has been deleted. You can restore it from the Recycle Bin." instead of chat input
    -   Do now allow chatting via API, or some compatible API _(like OpenAI compatible)_ as well, return error "This agent has been deleted. You can restore it from the Recycle Bin."
-   Anonymous users do not see the deleted agents at all
-   Agent menu is in file `/apps/agents-server/src/app/agents/[agentName]/AgentOptionsMenu.tsx`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨📗] Visual of `/recycle-bin` should be same as `/`

-   Agents listed in `/` have nice agent cards with image and colorful look
-   Update `/recycle-bin` to use same agent cards for listing deleted agents
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, reuse same components in both places `/`, `/agents` and `/recycle-bin`.

---

[ ]

[✨📗] When agent is deleted or restored, update the agent list right away

-   You can delete agents in `/` or in `/agents` page and restore them in `/recycle-bin`
-   When you delete or restore an agent, it happens, but you still see the old list of agents until you refresh the page
-   Update the agent list right away after deleting or restoring an agent, so user does not need to refresh the page to see the updated list
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
