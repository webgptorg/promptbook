[ ] !

[✨🕎] Create a commitment `META DISCLAIMER`

-   This will have Markdown content which will be shown in a pop-up menu before the user is allowed to chat with this agent.
-   This can be used for legal disclaimers, warnings, or any important information that the user should read before interacting with the agent.
-   The information about agreeing to the disclaimer should be stored alongside the user data.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality and other `META` commitments before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

## Example

```book
My AI Agent

PERSONA Helpful assistant
META DISCLAIMER

This agent provides information that may **not be accurate**. Always verify the information from reliable sources before taking any action based on it.
```

## Commitments

Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
-   Commitments are in the folder `/src/commitments`
-   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
-   Agent source with commitments is parsed by two functions:
    -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
    -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

## User data

-   There are users in the agent server.
-   These users are more like administrators. Not every visitor should be logged in; only administrators are logged in.
-   For the anonymous users, there is created a temporary AdHoc user.
-   User data are stored in a database.
-   The ad-hoc user is identified in the cookies.
-   The logged-in user is also identified in the cookies.

[-]

[✨🕎] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕎] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕎] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
