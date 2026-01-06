[x]

[✨⌨️] Show linked Agents on Agent profile via the capability chips

-   On Agent profile there are chips showing various capabilities of the Agent like "Search", "Browser",...
-   Add also chips for linked Agents
-   For each linked Agent show one chip with the name of the linked Agent leading to the profile of the linked Agent
-   The chips are shown both on the Agent profile page and also in the Agent list view in `/` on home page of Agents Server
-   When the Agent inheriting from Adam agent, do not show the Adam agent as linked agent.
-   When the Agent inheriting from VOID agent, do not show the VOID show special icon
-   Reflect also the type of link in the chip icon (inheritance, import, etc.) and if it is local or remote - Now it will be 5 icons in future 7 icons.
    -   No inheritance - VOID
    -   Inheritance - local
    -   Inheritance - remote
    -   Import - local
    -   Import - remote
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Linked Agents** are Agent which are somehow connected to another Agent, it can be:

1. Via Inheritance - where one Agent inherits behavior via `FROM` commitment from another Agent or impicitly from Adam agent.
2. Via `IMPORT` commitment
3. More mechanisms in the future.

This is relevant for both agents on same server and agents across multiple servers.
Reflect the link type and if it is local or remote in the chip icon. But the text of the chip should be the just name of the linked Agent.

---

[x]

[✨⌨️] On the home page of Agents Server, allow to show agents in social graph

-   Show the agents in graph view, where each agent is a node and the edges are the links between agents (inheritance, import, etc.)
-   Allow to zoom in and out of the graph
-   Allow to drag and move the nodes
-   Use the same component of the Graph as is used in Neo4j showing graphs
-   Allow to filter the connection types shown in the graph (inheritance, import, etc.)
-   Allow to click on the agent node to open the agent profile
-   Allow to filter out just specific one agent and in the graph show only this agent and its linked agents
-   The graph should be performant even for large number of agents (1000+)
-   The graph should work well both on desktop and mobile devices
-   The filter properties should be persisted in the URL query parameters, so the graph can be shared with specific filters applied
-   Allow to switch between list view and graph view via tabs on the top of the agents
-   Keep the list view as default view, there should be two tabs - List and Graph, look how views are implemented for example in the `/admin/images`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Linked Agents** are Agent which are somehow connected to another Agent, it can be:

1. Via Inheritance - where one Agent inherits behavior via `FROM` commitment from another Agent or impicitly from Adam agent.
2. Via `IMPORT` commitment
3. More mechanisms in the future.

This is relevant for both agents on same server and agents across multiple servers.

---

[-]

[✨⌨️] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Linked Agents** are Agent which are somehow connected to another Agent, it can be:

1. Via Inheritance - where one Agent inherits behavior via `FROM` commitment from another Agent or impicitly from Adam agent.
2. Via `IMPORT` commitment
3. More mechanisms in the future.

This is relevant for both agents on same server and agents across multiple servers.

---

[-]

[✨⌨️] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨⌨️] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
