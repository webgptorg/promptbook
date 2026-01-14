[x]

[✨♕] When the `USE TIME` is used, show the chiplet which will show that time was used.

-   Make it similar to `USE SEARCH ENGINE` chiplet,
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](screenshots/2025-12-1120-agents-server-show-use-time-chips.png)

---

[x] _<- Note: Done by Cline `gemini-3-flash`_
[ ] _<- Note: Done by OpenAI Codex_

[✨♕] Fix the chiplet details popup for the time tool

-   When the `USE TIME` tool is used, there is shown a chiplet with the information that time was used, and when clicking on it, there is shown a popup with details and clock visualization.
-   But there are confused two distinct things: The chiplet + popup should NOT show the current time, It should show the time when `get_current_time` was used.
    -> You are showing the result from the tool call, which already happened in the past.
-   The used toolcalls should be stored in `ChatMessage` object in `ChatMessage.toolCalls`
-   In `ChatMessage.toolCalls` should be all the raw data from the tool call, including the raw input (the arguments), timestamp when the tool was called and what was the result and/or error(s) and warnings.
-   The information in the chiplet and popup should be based only on theese data, no new run is made
-   This is relevant for commitments `USE TIME`, `USE SEARCH ENGINE` and in future for other similar commitments that are bringing tools into the `modelRequirements`.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Context:**

-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `/src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `/apps/agents-server` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

![alt text](screenshots/2025-12-1120-agents-server-show-use-time-chips-1.png)

---

[-]

[✨♕] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨♕] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
