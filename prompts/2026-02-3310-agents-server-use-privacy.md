[ ] !

[✨🍐] Create a commitment `USE PRIVACY`

-   This commitment will add instructions and tool `turn_privacy_on`
-   This tool will be used to turn on the privacy mode for the agent, which means that the agent won't store any information about the user or the conversations. This can be useful for sensitive topics or for users who want to have a more private experience with the agent.
-   Before turning on the privacy user got a pop-up model to explain what it means and confirms to turn it on.
-   For now, use the private mode which already exists in the chat.
-   In the future you will be implementing proper encryption but for now just use the private mode which already exists in the chat.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of chat and private mode and commitments before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

## Commitments

Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
-   Commitments are in the folder `/src/commitments`
-   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
-   Agent source with commitments is parsed by two functions:
    -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
    -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

---

[ ]

[✨🍐] Encryption in privacy mode

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍐] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍐] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
