[x]

[✨📈] Implement `IMPORT` commitment.

-   `IMPORT` is similar to `FROM`
    -   `FROM` can be at agent source only once, and it's imported at the beginning of the agent source _(and it is already implemented)_
    -   `IMPORT` can be used multiple times in the agent source, and it imports the content at the location of the `IMPORT` commitment
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Look at file `/apps/agents-server/src/app/agents/[agentName]/api/book/route.ts`
-   Look at file `/apps/agents-server/src/utils/resolveInheritedAgentSource.ts`
-   Look at file `/apps/agents-server/src/utils/importAgent.ts`
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

[✨📈] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨📈] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨📈] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
