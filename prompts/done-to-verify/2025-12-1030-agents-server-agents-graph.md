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

[x]

[✨⌨️] When showing linked Agents in graph view, show also the agents from federated servers

-   Each federated server should be represented as a cluster in the graph
-   The agents from federated servers should be shown in their respective clusters
-   The links between agents should be shown across clusters, representing the connections between agents on different
-   Allow to filter the federated servers shown in the graph
    -   Keep current filter for agents and put there a groups for each server
    -   The first item is "All Agents"
    -   The first group is "This Server" showing agents from local server
    -   Then each federated server is one group showing agents from this server
    -   You can pick All Agents, entire one server, or specific agents from any server
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Linked Agents** are Agent which are somehow connected to another Agent, it can be:

1. Via Inheritance - where one Agent inherits behavior via `FROM` commitment from another Agent or impicitly from Adam agent.
2. Via `IMPORT` commitment
3. More mechanisms in the future.

This is relevant for both agents on same server and agents across multiple servers.

![alt text](screenshots/2025-12-1030-agents-server-agents-graph.png)

---

[x]

[✨⌨️] Fix issues with federated agents in the Agents Graph view

-   There arent listed the agents from other federated servers but should be. The federated servers should be shown in the graph when the graph view is picked.
-   Do not show federated servers in the list view at all when the graph view is picked. `?view=graph`
-   When the list view is picked _(the default one)_, show all the agents in a list view: the current server and also the federated servers. The federated servers are shown right away each with a spinning loader. Agents from each federated server is loaded independently and shown progressively as they are loaded. _(This is already working)_
-   Implement equivalent mechanism to the graph view:
    -   When the graph view is picked `( ?view=graph )`, show all the agents from the current server and also the federated servers.
    -   For each federated server, show a cluster with loading indicator while the agents from this server are being loaded.
    -   When the agents from the federated server are loaded, show them in the cluster.
    -   When there is error loading agents from federated server, show the error message in the cluster.
    -   Same information should be shown in the dropdown filter for federated servers, show loading indicator or error message for each federated server while loading agents from this server.
-   The agents from federated servers should be shown in their respective clusters
-   The links between agents should be shown across clusters, representing the connections between agents on different
-   Allow to filter the federated servers shown in the graph
    -   Keep current filter for agents and put there a groups for each server
    -   The first item is "All Agents"
    -   The first group is "This Server" showing agents from local server
    -   Then each federated server is one group showing agents from this server

![alt text](screenshots/2025-12-1030-agents-server-agents-graph-1.png)
![alt text](screenshots/2025-12-1030-agents-server-agents-graph-2.png)

---

[x]

[✨⌨️] When showing linked Agents in graph view, Loading of federated servers always fails.

-   Fix the issue with loading agents from federated servers in the graph view, it always fails and in dropdown filter shows "(error)".
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`

![alt text](screenshots/2025-12-1030-agents-server-agents-graph-3.png)
![alt text](screenshots/2025-12-1030-agents-server-agents-graph-4.png)

---

[x]

[✨⌨️] Make the Agents Graph visually more appealing

-   The arrow should be at the end of the edge showing the direction of the link
-   The chip with the agent should be visually more appealing, Use image and color of the agent in a nice looking circle.
    -   In The tooltip shows the agent description. Do not replicate the agent name.
-   The Group around federated agent server should be circle, not square.
-   Also, the group around federated servers should not overlap. It should be separate, distinct clusters. Connection between the agents can go across the federated server group boundary.
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](screenshots/2025-12-1030-agents-server-agents-graph-5.png)
![alt text](screenshots/2025-12-1030-agents-server-agents-graph-6.png)

---

[x]

[✨⌨️] The relations in the agent graph aren't shown fixed.

-   You should show the relations between agents as directional graph arrows and according to the user preferences in the checkboxes. Now, no arrows are in the graph.
-   On the Screenshot of the localhost server. The relationship between "Sophia Green" and "Sophia Supergreen" has the inheritance between each other, but no arrow is shown.
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

```book
Sophia Green

PERSONA Creative and imaginative digital companion.
RULE Maintain a neutral and unbiased tone in all responses.
```

```book
Sophia Supergreen

FROM http://localhost:4440/agents/EqvCgWPytPdfwW
```

**<- Note: `EqvCgWPytPdfwW` is Sophia Green agent.**

![alt text](screenshots/2025-12-1030-agents-server-agents-graph-7.png)

---

[x]

[✨⌨️] In the agent graph, each agent should have its own profile picture in the circle.

-   Now, there are shown circles, but the circle has a monotone color of the agent.
-   This color should be preserved but only as a background, not the full picture.
-   Look at the list view. List view has proper images of the agents.
-   It should work for both default images and images set by `META IMAGE` commitment.
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](screenshots/2025-12-1030-agents-server-agents-graph-7.png)
![alt text](screenshots/2025-12-1030-agents-server-agents-graph-8.png)

---

[x]

[✨⌨️] Agents social graph on home page are trying to constantly to refetch the agents image which fails to load

-   When there is some problem with agent image, the agent graph on the home page shouldn't handle it properly.
-   When the image fails to load, it should show some placeholder image or just the colored circle with initials of the agent name.
-   Limit the number of retries to load the image to 3 attempts.
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](screenshots/2025-12-1030-agents-server-agents-graph-9.png)
![alt text](screenshots/2025-12-1030-agents-server-agents-graph-10.png)
![alt text](screenshots/2025-12-1030-agents-server-agents-graph-11.png)

---

[x]

[✨⌨️] Enhance visuals of the agent connections on the Agents Graph on home page

-   Each agent is one node in a directional graph.
-   The related agents / nodes should be more distant from each other.
-   The arrow of the connection should look like this "-->" _(not "->-" this)_ and shouldnt be animated with particles.
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](screenshots/2025-12-1030-agents-server-agents-graph-12.png)

---

[x]

[✨⌨️] Enhance visauals of the Agents Graph on home page

-   Look at the agent graph and make it visually more appealing.
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](screenshots/2025-12-1030-agents-server-agents-graph-13.png)

---

[-]

[✨⌨️] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨⌨️] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨⌨️] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server` the home page, agent view `http://localhost:4440/?view=graph`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
