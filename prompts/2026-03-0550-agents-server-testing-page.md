[ ]

[✨🕋] Create internal testing page on `/test` in Agents Server to showcase system capabilities

-   *(@@@@ Written by agent)*
-   Add an internal “Testing” page available at route `/test` in the Agents Server UI, meant for developers to quickly verify miscellaneous system capabilities end-to-end in one place.
-   The page should be clearly marked as non-production UI and should not be discoverable for normal users (guard it behind @@@: env flag / admin-only / localhost-only / basic auth / feature flag).
-   Include a simple list of “capability cards”, each with:
    -   brief description
    -   minimal inputs (if needed)
    -   a “Run” button
    -   an output area showing result, raw JSON, and errors
    -   copy-to-clipboard for both input payload and output
-   Initial capability cards (adjust to what exists in the current codebase):
    -   “Health / version” ping (server status, build SHA if available) @@@
    -   “LLM call smoke test” (small prompt, shows streaming/non-streaming behavior) @@@
    -   “Tool calling demo” (invokes at least one toolcall and renders toolcall record) @@@
    -   “Web scrape URL” demo (fetch/scrape a URL and show extracted text/markdown) @@@
    -   “File upload / attachment pipeline” demo (upload a file and show how it is stored/processed) @@@
    -   “Vector store / retrieval” demo (index a snippet, query it, show retrieved chunks) @@@
-   Keep the implementation extremely simple; this is a debug utility page, not a polished feature.
-   Ensure all actions are safe by default (rate limit / size limit / clear warnings for expensive operations).
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Files / places this PRD touches:
    -   UI routing for the Agents Server app @@@
    -   API endpoints or client calls used by the capability cards @@@
    -   Shared UI components for “capability cards” (new, small, local to `/test`) @@@
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕋] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕋] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕋] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
