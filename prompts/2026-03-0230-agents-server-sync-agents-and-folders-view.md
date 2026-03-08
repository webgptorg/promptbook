[ ]

[✨📲] Synchronize agents & folders view when navigating

-   *(@@@@ Written by agent)*
-   When navigating around the Agents Server (root and inside folders), the list view of agents/folders can become stale (e.g., not reflecting the latest state) or desynchronized between tabs. Make sure the agents/folders view is always synchronized with the actual current state.
-   Treat this primarily as a correctness + UX issue: after any navigation event, the list content and the selected/active folder/agent should match the URL and current server state.
-   Define and fix the root causes (likely cache invalidation / client state persistence / router transitions / React Query (or similar) stale data) rather than papering over with hard reloads.
-   Expected behavior:
    -   Root listing: after opening/closing an agent, creating/renaming/deleting/moving agents or folders, and after using browser back/forward, the root list reflects the current data.
    -   Folder listing: same as root, but scoped to the current folder; switching between folders updates the list reliably.
    -   New tab / multiple tabs: if a change is made in another tab, returning to the list should refresh within @@@ seconds or on focus/visibility change (choose simplest robust approach).
    -   No flicker or obvious “loading” regressions; keep the UI responsive.
-   Implementation notes / acceptance criteria:
    -   Add an explicit synchronization strategy (e.g., refetch on route segment change + refetch on window focus/visibility + invalidate relevant queries after mutations).
    -   Ensure query keys (or cache keys) include all required scoping params (folder id/path, user/team, search query, sort, etc.) so we never show results for a different folder.
    -   Add minimal instrumentation/logging (only in dev) to detect stale list usage and help future debugging.
    -   Add a regression test plan (manual steps are OK) covering root and folder navigation and the “new tab” scenario.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Files/areas to look at (update as you discover the real ones):
    -   [agents list / folders list components](apps/agents-server/src/components/@@@)
    -   [agents listing routes](apps/agents-server/src/app/@@@)
    -   [data fetching + caching layer](apps/agents-server/src/@@@)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📲] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📲] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📲] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
