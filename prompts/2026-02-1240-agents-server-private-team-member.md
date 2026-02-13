[ ]

[✨🎙] When you reference a `TEAM` member who is private, it doesn't work.

**For example:**

```book
AI Team manager

TEAM
You can discuss things with a {Lawyer}, {Copywriter}, and {Developer}.
```

-   When the "Lawyer", "Copywriter", or "Developer" is private (not public), it doesn't work and the agent will not be able to talk with this team member.
-   But it should work, because when you reference a team member on the same server, it should just assume that the agent who has this agent as a team member has access to this agent.
-   This is different for the federated servers. For a federated server, you need to have a public agent in a team.
-   Later, there will be introduced some proper token system to allow adding as a team member's private agents.
-   But for now, if the agent is on the same server, just assume that it is accessible.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎙] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎙] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎙] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
