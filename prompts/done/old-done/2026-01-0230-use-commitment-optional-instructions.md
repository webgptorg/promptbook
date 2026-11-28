[x]

[✨😖] Allow to pass additional text into `USE SEARCH ENGINE` and `USE TIME`

```book
John Doe

USE SEARCH ENGINE Search only in english language
```

-   The `SEARCH ENGINE` commitment adds the capability to search the web.
-   In this case the text "Search only in english language" are extra instructions for the current agent about when to use the search engine.
-   Theese instructions should be parsed by the commitment implementation and added into the system message alongside the basic instructions about using the search engine.
-   Similarly for the `USE TIME` commitment:
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Context:**

-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE TIME`, `USE SEARCH ENGINE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

---

[-]

[✨😖] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨😖] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨😖] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
