[x] ~$0.6130 40 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🌓] Skeleton loading across Agents Server

-   Replace generic spinners / “Loading…” full-screen placeholders with skeleton loading wherever the user is waiting for a whole view or large layout section to load (e.g. agent profile, agent chat, switching chats, initial load of lists).
-   Keep spinners for places where skeletons do not make UX sense (primarily: buttons / small inline actions), but ensure there is always a clear progress / busy indication.
-   Implement skeletons in a DRY way (shared skeleton components + shared loading wrappers for common layouts) and reuse them across pages.
-   Skeletons should match the final layout proportions (header, sidebar, main content, list rows, chat bubbles) to reduce perceived layout shift.
-   Ensure skeletons work well for responsive breakpoints (mobile/desktop) and for both light/dark modes (if supported).
-   Replace loading UI for chat switching:
    -   When switching between chats, show the chat thread skeleton (message bubble placeholders) instead of blank state or text loading.
    -   When loading the left panel chat list updates, show list-row skeletons.
-   Replace loading UI for agent profile:
    -   Show skeleton for agent hero section (avatar/image, title, description, chips/metadata) and for the tabs/sections below.
-   Replace loading UI for homepage / agent list / graph views where applicable:
    -   Lists: row/card skeletons.
    -   Graph: show a skeleton container and/or blurred placeholder that keeps layout stable until the graph is ready.
-   Add a small internal guideline (code comment or short doc snippet) clarifying when to use skeleton vs spinner vs “optimistic UI”, to keep consistency.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌓] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌓] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌓] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

