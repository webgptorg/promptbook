[x] ~$0.6341 19 minutes by OpenAI Codex `gpt-5.4`

[🦴🧩] Fix skeleton loading for all agent pages (Agents Server)

-   Problem: Skeleton loading in Agents Server is polished and correct for:
    -   Home page, for example https://pavol-hejny.ptbk.io/
    -   Agent profile page, for example https://pavol-hejny.ptbk.io/agents/RkY8m1bcMm5EWc
    -   Agent chat page, for example https://pavol-hejny.ptbk.io/agents/RkY8m1bcMm5EWc/chat?chat=jeyMiLKBSvG5zH
        But for other pages the loading UI incorrectly shows the Agent Profile skeleton or homepage skeleton, which does not match those pages’ layouts.
-   Goal: Ensure each route under an agent shows an appropriate skeleton that matches its final layout and perceived structure.
-   UX principles:
    -   Skeleton should approximate layout (regions, spacing) rather than content.
    -   Prefer reusing skeletons for pages with similar layouts.
    -   Unique skeletons only for truly unique page layouts.
    -   Keep DRY: introduce a small system to map routes/pages → skeleton component.
-   Deliverables:
    -   Audit all agent menu pages and group them into layout families (e.g., “textarea/editor-like”, “list/table-like”, “two-column settings-like”, “graph-like”, etc.). Output list in code comments or simple doc.
    -   Implement skeleton components per family and per unique page where needed.
    -   Implement a routing/layout-level selection mechanism so each agent page automatically renders the correct skeleton while data/layout is loading.
-   Technical notes / constraints:
    -   Skeletons on homepage, agent profile, and agent chat should be preserved as they are and used as a good sample of quality skeletons.
    -   Keep skeletons lightweight (no data fetching).
    -   Do not regress existing good skeletons (home, agent profile, agent chat).
    -   Avoid duplicating page markup; skeletons should be their own components.
    -   Ensure skeletons work with Next.js App Router `loading.tsx` conventions (segment-based).
-   Implementation idea (preferred):
    -   Introduce an `AgentPageLoadingSkeleton` entrypoint that receives a `variant` (enum) and renders the correct skeleton.
    -   For each agent sub-route segment, add `loading.tsx` that selects the right variant.
    -   Where multiple routes share layout, reuse the same `loading.tsx` via shared layout segment or shared component import.
-   You are working with the [Agents Server](apps/agents-server)
-   Acceptance criteria:
    -   For every page linked in the agent menu, when navigating with cold cache / forced slow network, the skeleton shown matches that page’s layout family (not the profile skeleton unless it is the profile page).
    -   No agent menu page shows the Agent Profile skeleton incorrectly.
    -   Skeleton selection mechanism is documented in code (brief comment) and easy to extend for new pages.
    -   Visual review: skeleton spacing/structure aligns with final UI within reason.

