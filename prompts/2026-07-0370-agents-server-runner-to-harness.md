[ ]

[✨🛍] Rename the "Code runner" to "Harness"

-   On `/admin/code-runners` there is option to sign in to harness like OpenAI Codex to use the subscription instead of API key
- But there is no "Code runner" anymore, now it is called "Harness" across the repository
- Rename `/admin/code-runners`  to `/admin/harness-auth`
-   Change the page textation accordingly, for example "Code runner" to "Harness"
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)


