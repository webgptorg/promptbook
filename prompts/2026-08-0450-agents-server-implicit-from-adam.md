[ ] !

[✨🟥] Every agent should implicitly inherit from `@Adam`

**This should be effectively same:**

```book
Generic chatter

GOAL Keep your projects up to date
CLOSED
```

**As this:**

```book
Generic chatter

FROM @Adam
GOAL Keep your projects up to date
CLOSED
```

**Or this:**

```book
Generic chatter

FROM {Adam}
GOAL Keep your projects up to date
CLOSED
```

-   When I want to have an agent which doesn't inherit from anything, there should be explicitly `FROM @Null` / `FROM {null}` in the agent source.
-   Adam is one of core agents
-   If the Adam agent is missing from the server, show the same message on the right panel as if referencing explicitly some not found agent, but right away, provide the user with the option to reinstate the agent and also reinstate other core agents if they are also missing. Also put a link to the core agents admin page.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
