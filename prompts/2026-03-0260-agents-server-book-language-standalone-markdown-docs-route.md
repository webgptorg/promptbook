[ ]

[✨🍪] Book language documentation: expose as one up-to-date standalone markdown via Agents Server route

-   *(@@@@ Written by agent)*
-   Create a canonical route that returns the Book language documentation as **one standalone markdown** intended to be copy-pasted into another AI / given to a developer as the only learning material.
-   Link/expose this route from the Agents Server documentation page (there is already something similar; make this new route the canonical source and keep any old route(s) as redirect/alias if needed).
-   The markdown must be dynamically generated from source-of-truth building blocks so it stays up-to-date by design:
    -   Reuse existing commitment docs, commitment schemas, and any existing “book language docs” generator logic.
    -   If current docs are too shallow, improve the source blocks (commitment docs, examples, etc.) and have both UI docs and the standalone markdown consume them.
    -   Avoid duplicated/hand-copied docs (one truth).
-   The generated markdown must include (in the same document):
    -   What “Book language” is, what problems it solves, and how it’s executed/compiled in Promptbook/Agents Server
    -   Minimal mental model of an agent (inputs, outputs, memory/knowledge, tools, safety)
    -   How to structure good agents in Book language (patterns + tradeoffs)
    -   Reference of Book language primitives/constructs + commitment catalog (with clear semantics)
    -   Great end-to-end examples with explanations (each should include: goal, full source, and walkthrough):
        -   Minimal hello-world agent
        -   Tool-using agent
        -   Multi-step agent (planning + execution)
        -   Agent with knowledge + memory usage
        -   Troubleshooting / debugging example (common mistakes + fixes)
    -   A final “Build an agent from scratch” tutorial that is sufficient without internet access
-   Decide and document the canonical URL shape and keep it stable (example: `/api/docs/book-language.md` or `/docs/book-language.md`).
-   Ensure correct response headers:
    -   `Content-Type: text/markdown; charset=utf-8`
    -   Define caching strategy:
        -   Default: no-store (always freshest)
        -   Optional: short-lived cache with clear invalidation story (e.g. build hash/version) @@@
-   Add minimal automated checks:
    -   Route responds 200 and `text/markdown; charset=utf-8`
    -   Output contains key required markers/sections (smoke test), so missing content fails CI
-   Keep the markdown readable in plain text:
    -   Prefer stable anchors (for downstream linking) and an optional table-of-contents
    -   Proper fenced code blocks
    -   No reliance on images; any visuals described textually
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Files / parts of the project this PRD is about:
    -   Agents Server docs page that should link to the markdown (apps/agents-server/src/app/@@@)
    -   New markdown route handler (apps/agents-server/src/app/@@@/route.ts)
    -   Existing docs generator / docs components (apps/agents-server/src/components/** @@@)
    -   Book language + commitments source-of-truth (src/commitments/**, src/book/**, docs/** @@@)
    -   Tests for the new route (apps/agents-server/src/**/__tests__/** or apps/agents-server/src/**/__tests__/** @@@)
    -   Any old/legacy docs route that should be redirected/aliased (apps/agents-server/src/app/@@@/route.ts @@@)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍪] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍪] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍪] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
