[ ]

[🦴🧩] Fix skeleton loading for all agent pages (Agents Server)

-   *(@@@@ Written by agent)*
-   Problem: Skeleton loading in Agents Server is polished and correct for:
    -   Home page
    -   Agent profile page
    -   Agent chat page
    But for other pages under an agent (see agent menu), the loading UI incorrectly shows the Agent Profile skeleton, which does not match those pages’ layouts.
-   Goal: Ensure each route under an agent shows an appropriate skeleton that matches its final layout and perceived structure.
-   Scope: Only “agent pages” (routes under `/agents/[agentName]/...` and the agent menu pages). Non-agent pages are out of scope.
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
    -   Keep skeletons lightweight (no data fetching).
    -   Do not regress existing good skeletons (home, agent profile, agent chat).
    -   Avoid duplicating page markup; skeletons should be their own components.
    -   Ensure skeletons work with Next.js App Router `loading.tsx` conventions (segment-based).
-   Implementation idea (preferred):
    -   Introduce an `AgentPageLoadingSkeleton` entrypoint that receives a `variant` (enum) and renders the correct skeleton.
    -   For each agent sub-route segment, add `loading.tsx` that selects the right variant.
    -   Where multiple routes share layout, reuse the same `loading.tsx` via shared layout segment or shared component import.
-   Files / areas to touch:
    -   You are working with the [Agents Server](apps/agents-server)
    -   Agent routes: `apps/agents-server/src/app/agents/[agentName]/...` @@@
    -   Potential redirect route (ensure not affecting loading): `apps/agents-server/src/app/[agentName]/[...rest]/page.tsx`
    -   Skeletons: `apps/agents-server/src/components/Skeleton/*`
    -   Add/update loading guideline if needed: `apps/agents-server/src/components/Skeleton/LOADING_GUIDELINE.md`
    -   Add the changes into the [changelog](changelog/_current-preversion.md)
-   Acceptance criteria:
    -   For every page linked in the agent menu, when navigating with cold cache / forced slow network, the skeleton shown matches that page’s layout family (not the profile skeleton unless it is the profile page).
    -   No agent menu page shows the Agent Profile skeleton incorrectly.
    -   Skeleton selection mechanism is documented in code (brief comment) and easy to extend for new pages.
    -   Visual review: skeleton spacing/structure aligns with final UI within reason.
-   Testing:
    -   Manual: throttle network and click through every agent menu item, confirm correct skeleton.
    -   Optional: lightweight Playwright screenshot test per route family @@@
-   Open questions:
    -   Please list the current agent menu pages (or confirm we should derive from code) and which ones you consider “unique layouts” vs “reusable families”. @@@
    -   Should skeletons be themed for dark mode explicitly or rely on existing Skeleton component styling? @@@
    -   Any pages where you prefer a spinner instead of skeleton (e.g., tiny panels)? @@@
