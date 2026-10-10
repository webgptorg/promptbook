[x]

[✨🍲] In the agentSource / book you should be able to define custom domain via `META LINK`

**For example:**

```book
My Agent

PERSONA An expert in web development.
META LINK myagent.example.com
```

-   Purpose of this is to write `META LINK myagent.example.com` in the book, point DNS record to the Agents Server deployment, and then access the agent directly via `myagent.example.com` domain _(not https://agents-server.com/agents/myagent)_
-   Create commitment `META LINK` in the book
-   All of these notations should work:
    -   `META LINK myagent.example.com`
    -   `META LINK https://myagent.example.com`
-   In the `Agents Server` application implement routing
    -   At first, look at host and if the host matches one of the `SERVERS` domains
    -   If there is a match, route to the Agents server
    -   Then try to find the agent by `META LINK` domain
    -   If found, route to that agent
-   These are the links to the same agent:
    -   `https://agents-server.com/agents/myagent` - shows the agent `myagent` with the Promptbook Agents server header bar, its purpose is to show that this agent is hosted on Promptbook Agents server mainly for internal use
    -   `https://myagent.example.com` - shows the agent `myagent` without the Promptbook Agents server header bar, its purpose is to show that this agent is hosted on custom domain mainly for public use and sharing
    -   -   Both of these links are the same agent, just different routes with slightly different UI
-   Then fallback to 404 not found
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🍲] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🍲] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🍲] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
