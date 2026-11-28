[x]

[✨💴] Create commitment `FROM`

```book
My AI Agent

FROM https://s6.ptbk.io/benjamin-white
RULE Speak only in English.
```

<- This will inherit everything from the agent at `https://s6.ptbk.io/benjamin-white` and appends the RULE commitment to its source.

-   This commitment tells the agent that its `agentSource` is inherited from another agent.
-   It should work for example in context of the `Agents Server` application `/apps/agents-server`
    -   It should work with both internal and external agents
    -   External agents are agents from federated servers
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[x]

[✨💴] Make commitment `FROM` work

**For example, the following agent source:**

```book
My AI Agent

FROM https://s6.ptbk.io/benjamin-white
RULE Speak only in English.
```

-   The linked agent `https://s6.ptbk.io/benjamin-white` is the parent agent.
-   It should fetch the parent agent's source code from the `{fromUrl}/api/book` endpoint.
-   The final agent source should be a combination of the parent agent's source and the current agent's source.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   When exposing the agent via `/agents/[agentName]/api/book` it should return the combined source.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨💴] Default from

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨💴] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨💴] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
