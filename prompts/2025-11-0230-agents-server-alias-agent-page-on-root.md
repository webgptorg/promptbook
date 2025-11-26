[x]

[✨🌺] All agent should be accessible through the `/[agentName]`

-   Now the agents are accessible through `/agents/[agentName]`
-   Change it such each agent is accessible through the root `/[agentName]` but also keep the old route `/agents/[agentName]` working, do not do any redirects, both routes should work the same way
-   On the root `/` page, change the links to agents to point to the new route `/[agentName]`
-   All the subroots of agents should work on the `/agents/[agentName]/...` route as before, for example `/agents/[agentName]/chat` is the chat page of the agent and the `/[agentName]/chat` route should be redirected to `/agents/[agentName]/chat`
-   QR code and copyable link for sharing the agent should use the new route `/[agentName]` regardless of which route the user is currently using
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🌺] Fix !!!

```log
 GET /agents/ava-blue 200 in 184ms
 GET /agents/ava-blue 200 in 9405ms
 ○ Compiling /[agentName]/[...rest] ...
 ✓ Compiled /[agentName]/[...rest] in 2.8s (3095 modules)
 GET /.well-known/appspecific/com.chrome.devtools.json 307 in 5583ms
 GET /agents/.well-known/appspecific/com.chrome.devtools.json 307 in 2318ms
 GET /agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 478ms
 GET /agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 557ms
 GET /agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 591ms
 GET /agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 505ms
 GET /agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 500ms
 GET /agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 685ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 1349ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 563ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 571ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 870ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 1792ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 494ms GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 530ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 739ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 588ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 538ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 586ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 611ms
 GET /agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/agents/.well-known/appspecific/com.chrome.devtools.json 307 in 635ms
```

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🌺] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🌺] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
