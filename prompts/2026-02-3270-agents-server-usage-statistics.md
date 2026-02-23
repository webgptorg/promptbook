[x] ~$0.00 17 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🆑] Count the usage statistics for the agent.

-   There should be a separate page which is accessible for admins where you can see detailed usage of the agents.
-   Also, there should be a global page showing an entire server or any particular folder.
-   There must be an ability to see it granularly.
    -   Per agent
    -   Per folder, per entire server
    -   Per timeframe
    -   Type of the call - Is it from the web? The API? The compatible API, like OpenAI compatible API? Call from a team member etc...
        -   Record also details about the disk call, like:
        -   From what API key is it?
        -   From what user agent is it?
-   Put there some good looking graph to visualize the usage.
-   Put the usage page under the agent context menu.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, Use the existing functions to do the usage counting. Do not create new ones.
-   You are not implementing limiting of this usage. You are just implementing it to show the usage. Limiting will be implemented in the future.
-   Do a proper analysis of the current functionality before you start implementing.
-   Create a database migration if it is needed.
-
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.09 3 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨🆑] Fix the link between the agent context menu and the usage.

-   Currently the navigation from the agent context menu to the usage page is broken. It doesn't filter that agent.
-   It navigates to _(for example)_ https://pavol-hejny.ptbk.io/admin/usage?agentName=hWTMMThSpx6Yk3
-   But it should navigate to _(for example)_ https://pavol-hejny.ptbk.io/admin/usage?agentName=aa&timeframe=30d
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[ ]

[✨🆑] Record full usage, not only the count.

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨🆑] Limiting the agent budget

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🆑] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🆑] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

