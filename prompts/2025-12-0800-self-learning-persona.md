[ ]

[✨🧑] Agents should be able to adjust their `PERSONA` and `RULE`

-   When the `agentSource` book is `OPEN` _(not closed)_ the `agentSource` is automatically modified during the conversation
-   Now the self-learning works with `USER MESSAGE`+`AGENT MESSAGE` and also `KNOWLEDGE`
-   Extend the self-learning functionality to allow the agent to also update its `PERSONA` and `RULE` sections based on the conversation context.
-   For example, if during the conversation the user provides new requirements about his personality and behaviour, the agent should be able to incorporate that information by appending `PERSONA` or/and `RULE` (one or more) commitment(s) at the end of its `agentSource`
-   Decide on a suitable format for adding/modifying `PERSONA` and `RULE` commitments, for example:
    -   `PERSONA You are now more friendly and casual.`
    -   `RULE Never write long answers, keep them concise.`
-   It should work for example in `Agents Server` application `/apps/agents-server`
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

[-]

[✨🧑] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🧑] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🧑] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
