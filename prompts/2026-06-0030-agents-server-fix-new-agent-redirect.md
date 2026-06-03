[ ] !

[✨👎] Fix new agent redirect

-   When the new agent is created, from the home page, it should redirect to the agent chat page immediately after the creation, but currently it navigates to the page but the page says "Agent Not Found :("
-   After the refresh the page is working and the agent is shown, but it should be shown immediately without the need to refresh the page, so it is more smooth and user friendly experience when creating new agents
-   Probably the problem is that after the agent is created, the page is navigated to the new agent chat page, but the agent data is not loaded yet, so it shows "Agent Not Found :(", but after the refresh, the agent data is loaded and shown correctly, so you need to make sure that after the agent is created, the agent data is loaded and available before navigating to the new agent chat page, so it can be shown immediately without any issues
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👎] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👎] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👎] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
