[x] ~$0.00

[✨😵] Add `RemoteAgent` integration

-   In http://localhost:4440/agents/5Y2pfB3z31r3nB/integration there are shown available integrations for the agent. (the 5Y2pfB3z31r3nB is agent ID)
-   Add new integration Promptbook SDK
-   Use the `RemoteAgent` class imported from `@promptbook/core` to create the integration.
-   Show example code snippets of 2 variants:
    1.  Simple: Add sample code snippet how to use the `RemoteAgent` to send a message to another agent in node environment.
    2.  Browser: Combine it in react component using `RemoteAgent` in `useMemo` hook and `<AgentChat/>` component to show the chat with the remote agent.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[x] ~$0.00

[✨😵] Add API key into OpenRouter Integration

-   In http://localhost:4440/agents/5Y2pfB3z31r3nB/integration there are shown available integrations for the agent. (the 5Y2pfB3z31r3nB is agent ID)
-   OpenAI Compatible API has already API key field, do the same for OpenRouter integration.
-   Verify OpenRouter integration works and check the API key is used.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ] @@@

[✨😵] RemoteAgent should require apiKey

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨😵] Allow to create api keys directly from integrations page

-   In http://localhost:4440/agents/5Y2pfB3z31r3nB/integration there are shown available integrations for the agent. (the 5Y2pfB3z31r3nB is agent ID)
-   You need api keys to use some integrations, for example OpenAI Compatible API or OpenRouter.
-   Add button "Create API Key" which creates new API key for the user if there
-   It must be user friendly and easy to use.
-   When created, the API key should have note like "Created for Agent {agentName}" so that user can identify why the key was created.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, logic for creating API keys is already in place in settings page and in codebase should be reused.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨😵] baz

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
