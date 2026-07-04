[x] ~$1.01 26 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🍪] Book language documentation: expose as one up-to-date standalone markdown via Agents Server route

-   There is already implementation of this in `/api/docs/book.md` from Agents server
-   Create a canonical route that returns the Book language documentation as **one standalone markdown** intended to be copy-pasted into another AI / given to a developer as the only learning material.
-   The markdown must be dynamically generated from source-of-truth building blocks so it stays up-to-date by design:
    -   Reuse existing commitment docs, commitment schemas, and any existing “book language docs” generator logic.
    -   If current docs are too shallow, improve the source blocks (commitment docs, examples, etc.) and have both UI docs and the standalone markdown consume them.
    -   Avoid duplicated/hand-copied docs **(one truth in the repository)**.
-   The generated markdown must include (in the same document):
    -   What “Book language” is, what problems it solves, and how it’s executed/compiled in Promptbook/Agents Server
    -   Minimal mental model of an agent (commitments, agent profile and `META` commitments, referencing other agents `FROM` inheritance, `TEAM` and `IMPORT`, `USE` commitments) and how to think about them when building agents
    -   How to structure good agents in Book language (patterns + tradeoffs)
    -   Reference of Book language primitives/constructs + commitment catalog (with clear semantics)
    -   All the commitments
    -   Great end-to-end examples with explanations (each should include: goal, full source, and walkthrough):
        -   Minimal hello-world agent
        -   Tool-using agent (Browser / Search engine)
        -   Agent with `RULE` and `KNOWLEDGE`
        -   `MEMORY` agent with long-term memory
        -   `USE PROJECT` and `WALLET` agent with external integrations
        -   Agents `TEAM`
        -   Do nots and common pitfalls
    -   A final “Build an agent from scratch” tutorial that is sufficient without internet access
-   Ensure correct response headers:
    -   `Content-Type: text/markdown; charset=utf-8`
    -   Define caching strategy:
        -   Default: no-store (always freshest)
-   Keep the markdown readable in plain text:
    -   Prefer stable anchors (for downstream linking) and an optional table-of-contents
    -   Proper fenced code blocks
    -   No reliance on images; any visuals described textually
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of the book language before you start implementing.
-   Keep in mind that there are two versions of the book language:
    1. Book 1.0 - Prompt Pipelines **<- This is old, Deprecated, and should not be mentioned or used in the new docs**
    2. Book 2.0 - Agent language **<- This is what the docs should be talking about**
    -   Unfortunatelly in the examples there is mostly Book 1.0, so here you have some good examples of Book 2.0 - `C:/Users/me/Downloads/promptbook-backup-2026-03-08/promptbook-backup-2026-03-08`
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

