[ ]

[✨🙂] The `PERSONA` commitment is deprecated

-   When creating any agent template/boilerplate, the `PERSONA` commitment should not be there
-   Use `GOAL`, `RULE` or `WRITING RULES` commitments instead of `PERSONA`
-   When `PERSONA` commitment is present in the agent source, it should be underlined in yellow and a warning should be shown in the BookEditor that this commitment is deprecated and should not be used anymore.
    -   Do this for all deprecated commitments, not just `PERSONA`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
