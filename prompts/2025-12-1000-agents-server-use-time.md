[x]

[✨🖲] Make commitment `USE TIME`

-   This will add ability to determine current date and time.
-   This should create tool into model requirements with the ability to determine current date and time
-   This tool wont receive any input and will output the current date and time as a ISO 8601 string.
-   This tool will add the ability to the agent to determine the current date or time to tell the user.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Context:**

-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

---

[ ]

[✨🖲] When creating OpenAI Assistant inside [Agent](src/llm-providers/agent/AgentLlmExecutionTools.ts), the used tools should be defined into the OpenAI assistant _(similar to `systemMessage` and knowledge files)_.

---

[-]

[✨🖲] bar

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🖲] bar

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
