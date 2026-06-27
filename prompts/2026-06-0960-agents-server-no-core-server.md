[ ] !!

[✨🥲] bar

-   @@@@@
-   The core agents should be copied from `agents/default/_core`, Adam agent is in `agents/default/_core/adam.book`
-  The `CORE_AGENTS_SERVER` shouldnt be here
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
- It doesnt matter what visibility the Adam agent have, it should be automatically used in all agents
-   If there is no _core folder on agents server or/and no well-known agents Adam or/and teacher, auto-create them
    Reuse the same mechanism as creating the default agents on the server start
-   Add the changes into the [changelog](changelog/_current-preversion.md)
