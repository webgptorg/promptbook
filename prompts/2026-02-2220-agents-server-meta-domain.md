[x] ~$0.42 38 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🚟] Add commitment `META DOMAIN`

```
My agent

PERSONA My agent is an expert in something.
META DOMAIN my-agent.com
```

-   `META DOMAIN` is a commitment that can be used to set the domain of the agent
-   The server is still running on its primary domain defined in `SERVERS`, but when the same server is asked and the host is this domain, show the agent profile page immediately.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
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

[✨🚟] Fix `META DOMAIN`

**This agent is hosted on a server `https://pavol-hejny.ptbk.io/agents/6BMWvZbP9h2s91/book`:**

```
Test web search 1

FROM VOID
META DOMAIN search.ptbk.io
USE TIME
USE SEARCH ENGINE
INITIAL MESSAGE
CLOSED
```

-   Domain `search.ptbk.io` is set in `META DOMAIN` is also pointed to the same server.
-   But it fails on "Error: Server with host "search.ptbk.io" is not configured in SERVERS", fix it so the server recognizes that this domain is also pointing to it and shows the agent profile page immediately when the request comes to this domain.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of domain routing in Agents server before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨🚟] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚟] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
