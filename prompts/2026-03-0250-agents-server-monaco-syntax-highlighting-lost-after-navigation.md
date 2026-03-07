[ ]

[✨⟹] Fix Monaco syntax highlighting lost after navigating back and forth to book editor

-   In the [Agents Server](apps/agents-server), the book editor uses Monaco editor for the promptbook source.
-   There is a bug where after navigating away from the book editor page and then back (client-side navigation, without full hard refresh), Monaco can lose syntax highlighting/tokenization.
-   Analyze the root cause (likely Monaco lifecycle / disposal / model reuse / language registration / CSS injection timing / Next.js app router caching) and implement a robust fix.
-   The fix must preserve editor state (content, cursor/scroll position) when possible and must not introduce memory leaks (editors/models must be disposed correctly on unmount).
-   Add a deterministic repro path in dev notes / code comments (what navigation sequence causes it) and add lightweight debug logging behind a dev flag if needed.
-   Ensure the language + theme is always re-applied when the editor is mounted (and that any custom token providers are registered exactly once).
-   Add an automated check if feasible (Playwright navigation test) or at minimum a manual QA checklist to verify highlighting persists after N back/forward navigations.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
-   You are working with:
    -   [apps/agents-server/src/app/... book editor route @@@]
    -   [apps/agents-server/src/components/... Monaco wrapper @@@]
    -   [src/book-components/BookEditor/BookEditorMonaco.tsx](src/book-components/BookEditor/BookEditorMonaco.tsx) _(if reused in Agents Server)_

---

[-]

[✨⟹] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⟹] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⟹] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)