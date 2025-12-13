[x]

[✨🥏] Identify agents via random ids not `agentName` derrived from the first line of `agentSource`

-   Add base 58 based unique identifiers to each agent in the Agents Server
-   In the `agentSource` keep generating random names for agents like "Noah Green" or "Sophia Brown" but also add a permanent unique identifier to each agent, such as a base58-encoded string (e.g., "3mJr7AoUXx2Wqd").
-   Also keep `agentName` derrived from the first line of `agentSource` for backward compatibility and easy human readability.
-   When accessing agents via URL or API, support both ways:
    -   By `agentName` derrived from the first line of `agentSource` e.g., `/agents/noah-green`
    -   By permanent unique identifier e.g., `/agents/3mJr7AoUXx2Wqd`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🥏] After new agent is created, redirect to agent `permanentId` not `agentName`

-   When a new agent is created in the Agents Server, after creation redirect the user not to the URL with the `agentName` derrived from the first line of `agentSource` but to the URL with the permanent unique identifier.
-   Keep supporting both ways of accessing agents:
    -   By `agentName` derrived from the first line of `agentSource` e.g., `/agents/noah-green`
    -   By permanent unique identifier e.g., `/agents/3mJr7AoUXx2Wqd`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🥏] When listing agents, use `permanentId` not `agentName`

-   When listing agents in the Agents Server, use the permanent unique identifier for links and references instead of the `agentName` derrived from the first line of `agentSource`.
-   It should be used in all places where agents are listed, such as:
    -   Home page `/` and agent page `/agents`
    -   Federated agents API
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🥏] brr

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
