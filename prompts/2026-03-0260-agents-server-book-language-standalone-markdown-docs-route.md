[ ]

[✨🍪] Book language documentation: expose as one up-to-date standalone markdown via Agents Server route

-   *(@@@@ Written by agent)*
-   Create a server route (or Next.js route handler) that returns the **Book language documentation as a single standalone markdown** file intended to be copy-pasted into another AI / given to a developer as the only learning material.
-   The route must be linked/exposed from the Agents Server documentation page (there is already something similar, but improve it to point to this new canonical output).
-   The markdown should be dynamically generated from existing sources so it stays up-to-date by design (avoid duplicated/hand-copied docs).
-   The generated markdown must include, besides commitment reference, also:
    -   High-level concept of “Book language” and how it compiles/executes in Promptbook/Agents Server
    -   How to structure good agents in Book language (practical guidance, patterns, tradeoffs)
    -   Great examples (minimum: one tiny hello-world, one tool-using agent, one multi-step agent with memory/knowledge, one troubleshooting example)
    -   A section that teaches the reader how to write a complete agent **from scratch** without needing the internet
-   Keep the output as **one large markdown** (not PDF, not multipage UI).
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Decide and document the canonical URL shape (example: `/api/docs/book-language.md` or `/docs/book-language.md`) and ensure correct content-type / caching headers (so downstream AI ingestion works reliably).
-   The dynamic generator should reuse/improve existing commitment documentation:
    -   If commitment docs are the current source, extend them to provide richer explanations and examples and have the generator include them
    -   Avoid having two “truths”; the standalone markdown should be assembled from the same source-of-truth blocks used elsewhere
-   Add basic automated checks:
    -   Route responds with 200 and `text/markdown; charset=utf-8`
    -   Output includes required anchors/keywords (smoke test for missing sections)
-   Ensure the markdown is readable in plain text:
    -   Uses stable anchors / table of contents (optional but recommended)
    -   Code blocks are properly fenced
    -   Examples are runnable with the current Agents Server / Promptbook conventions
-   You are working with the [Agents Server](apps/agents-server)
-   Files / parts of the project this PRD is about:
    -   [Agents Server documentation page](apps/agents-server/src/app/@@@)
    -   New markdown route handler (apps/agents-server/src/app/@@@/route.ts)
    -   Book language / commitment docs sources (src/commitments/**, src/book/**, docs/** @@@)
    -   Tests for the new route (apps/agents-server/src/**/__tests__/** @@@)
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
