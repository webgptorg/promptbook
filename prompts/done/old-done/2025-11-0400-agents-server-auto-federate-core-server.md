[x]

[✨🤡] Auto-Federate https://core.ptbk.io/

-   You can federate servers by using `FEDERATED_SERVERS` metadata
-   There shpuld be also a list of servers that are auto-federated _(no need to list them explicitly)_
-   Add this as config value to file `/servers.ts`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🤡] Load agents from federated servers dynamically

-   Now we are waiting for all the servers, when some of the federated servers is slow, it slows entire page load
-   Instead, load agents from federated servers dynamically after the main page load
-   Show a loading spinner in place of federated agents until they are loaded
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🤡] Fix Federated agents loading on home page

-   Strategy of the loading:
    1. Look directly for `/api/agents` endpoint on each federated server
    2. If 1) fails, look for `/agents/[federated-server]/api/agents` which is proxy endpoint through our server _<- implement this route_
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

![alt text](screenshots/2025-11-0400-agents-server-auto-federate-core-server.png)

---

[-]

[✨🤡] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
