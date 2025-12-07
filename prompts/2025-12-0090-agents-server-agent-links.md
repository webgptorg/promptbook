[x]

[✨🧃] Creare page `/agents/[agentName]/links`

-   This will be a signpost page with links to various resources related to the agent
-   Contain all links related to the agent in one place for easy access
    -   Contain important API endpoints for the agent
    -   Links to agent history and feedback page
    -   Links to integration guides for using the agent with different platforms
    -   Also include links related to entire agent server and entire Promptbook ecosystem
    -   And any other relevant resources
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🧃] Create Agent integration page which should all the aviable options how to integrate your agent

-   Currently it is working [Agent integration page](http://localhost:4440/agents/jack-green/website-integration)
-   Create page `/agents/[agentName]/integration` which will list all the aviable options how to integrate your agent
    -   Website integration (embed chat widget)
    -   OpenAI API compatible endpoint
    -   OpenRouter integration
    -   MCP integration
-   Create nice cards for each integration option with short description and link to detailed guide
-   Show also code snippets how to use each integration option
-   For OpenRouter integration and OpenAI API compatible endpoint, show also the endpoint URL, api key _(take first from existing API keys or link to quickcreate)_ and model name to use
    -   Also show simple code snippet how to call the OpenAI compatible endpoint via curl, python and javascript official OpenAI SDK
-   For all code snippets show nice Monaco editor with syntax highlighting _(look how its done on website-integration page)_
-   Update link into the `/agents/[agentName]/integration` on the [Agent page](http://localhost:4440/agents/jack-green) and [Agent links page](http://localhost:4440/agents/jack-green/links)
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

Show variants cURL, Python SDK, JavaScript/TypeScript SDK in tabs

---

You are showing URLs like `http://localhost:4440/api/openrouter` BUT it should be definitelly `https://localhost:4440/agents/jack-green/api/openrouter`
The OpenAI compatible endpoint, MCP and OpenRouter endpoints are per-agent, so the URL should contain the agent name in path.
Fix it everywhere.

---

[ ]

[✨🧃] Unite agent links

-   Both in [Agent page](http://localhost:4440/agents/jack-green), [Agent links page](http://localhost:4440/agents/jack-green/links), [Agent integration page](http://localhost:4440/agents/jack-green/integration) are links related to the agent
-   But its not respecting the DRY principle _(don't repeat yourself)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle, **links should be defined in one place and reused**.
-   You are working with the `Agents Server` application `/apps/agents-server`

---

[-]

[✨🧃] brr

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🧃] brr

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
