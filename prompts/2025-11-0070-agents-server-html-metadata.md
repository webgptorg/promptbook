[x]

[✨💟] Agent pages should contain proper HTML metadata

-   By metadata we mean at `<title>`, `<meta name="description" content="...">`, and Open Graph / Twitter Card tags
-   The metadata should be based on the agent's name and description stored in Promptbook
-   The metadata should be set for `/agents/[agentName]` and `/agents/[agentName]/chat` pages
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨💟] Open Graph image / Twitter Card image of the agent should have generated design from agent page

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Agent pages are `/[agentName]`, `/agents/[agentName]`, `/agents/[agentName]/chat`, `/agents/[agentName]/chat+book` and `/agents/[agentName]/book`
-   They have `META IMAGE` used as Open Graph image and Twitter Card image
-   But you should put there a screenshot (or visially simmilar elements) of the actual `/[agentName]` page, so it has more context about the agent directly in post previews on social media
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨💟] Favicon of agent should be their `META IMAGE`

-   For agent pages `/[agentName]`, `/agents/[agentName]`, `/agents/[agentName]/chat`, `/agents/[agentName]/chat+book`, `/agents/[agentName]/book`, the favicon should be set to the agent's `META IMAGE` (if available) if not, fallback to default favicon as is now
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨💟] Agents should be installable as PWA app

-   Add proper manifest and service worker to make agent pages installable as PWA (Progressive Web App)
-   We really want to make app from agent pages `/[agentName]` not the whole Agents Server
-   Each agent page should be installable separately as its own PWA app
-   Each agent page should have its own manifest with proper name, icons, etc.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨💟] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨💟] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨💟] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
