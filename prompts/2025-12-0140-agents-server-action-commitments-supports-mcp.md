[ ] _<- Note: Wait after `USE BROWSER` implementation_

[✨🏐] Allow to add MCP server to agent via `USE MCP` commitment

For example, this agent:

```book
Paul Smith & Associés

FINAL PERSONA You are a company lawyer.
Your job is to provide legal advice and support to the company and its employees.
You are knowledgeable, professional, and detail-oriented.
USE MCP http://mcp-server-url.com
```

-   `USE MCP` commitment allows to specify an MCP server URL which the agent will connect to for retrieving additional instructions and actions.
-   The agent should be able to connect to the specified MCP server and fetch instructions/actions as needed during its operation.
-   Do not be confused by MCP server of each agent, there are 3 separate things:
    -   Exposing an agent as MCP server
    -   Each agent being able to connect to external MCP servers _(this is done in this task)_
    -   Managing the entire instance of Promptbook Agents Server via MCP server
-   You are working with the `Agents Server` application `/apps/agents-server`
-   For the commitment `USE MCP` create its folder in `/src/commitments` and register it in the `/src/commitments/index.ts`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🏐] brr

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏐] brr

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🏐] brr

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
