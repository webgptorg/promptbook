[ ]

[✨📺] Agents should respect `META VISUAL` and use it when in the agent's source book

-   `META VISUAL` should be normalized, thr `META VISUAL Minecraft2`, `META VISUAL minecraft2`, `META VISUAL Minecraft2`, `META VISUAL minecraft-2`,... should be treated the same
    -   Reuse the existing mechanism for normalizing strings
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
