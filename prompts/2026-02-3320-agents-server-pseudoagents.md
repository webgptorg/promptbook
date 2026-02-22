[ ] !

[✨🆘] Create system of pseudo-agents.

```book
AI Agent

FROM {Void}
PERSONA You are a helpful assistant.
TEAM You can talk with a {lawyer} or {User}.
```

-   So the agent is referenced in the same way as any other agent.
-   The difference is that these agents aren't defined by any book, they are just pseudo-agents that exist only in the context of the agent that references them. They are like imaginary friends that the agent can talk to or use in other commitments referencing them.
-   For now there will be two pseudo agents:
    -   `{User}` which is the user that is talking to the agent, it cannot be used in `FROM` or `IMPORT` commitments, but it can be used in `TEAM` commitment to make the agent talk to the user or reference the user in other commitments, etc.
        -   From the agent point of view, `{User}` has the same role as any other agent referenced in a team commitment. But when the agent is talking to `{User}`, it means that it is talking to the user that is talking to the agent. So popup a modal with a chat interface to talk to the user when the agent is talking to `{User}`. This modal will end after one message.
    -   `{Void}` this represents the void, nothingness, it can be used in `FROM` commitment to create an agent that isn't based on any other agent, but it can also be used in other commitments to reference the void, nothingness, etc.
        -   Here is already a keyword `FROM VOID` used in same way, change it to `FROM {Void}` and make it work the same way as `FROM` commitment with normal agents.
-   Pseudo agents are case insensitive. Similarly to other agents. For example `{User}`, `{user}`, `{USER}` are the same pseudo agent.
-   They can be referenced in any way that normal agents can be referenced. For example `{User}`, or `@User`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🆘] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🆘] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🆘] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
