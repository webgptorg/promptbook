[x] ~$0.3375 18 minutes by OpenAI Codex `gpt-5.3-codex`

[✨⟹] Fix Monaco syntax highlighting lost after navigating back and forth to book editor

-   In the [Agents Server](apps/agents-server), the book editor uses Monaco editor for the promptbook source.
-   There is a bug where after navigating away from the book editor page and then back (client-side navigation, without full hard refresh), Monaco can lose syntax highlighting/tokenization.
-   Repro (example route): open `/agents/N4HGpxjCRjJDiH/book`, navigate to any other route in the app (client-side), then use browser Back (repeat multiple times) and observe that syntax highlighting can disappear.
-   Analyze the root cause (likely Monaco lifecycle / disposal / model reuse / language registration / CSS injection timing / Next.js App Router caching) and implement a robust fix.
-   The fix must preserve editor state (content, cursor/scroll position) when possible and must not introduce memory leaks (editors/models must be disposed correctly on unmount).
-   Add lightweight debug logging behind a dev flag if needed.
-   Ensure the language + theme is always re-applied when the editor is mounted (and that any custom token providers are registered exactly once even if there are multiple Monaco instances in Agents Server).
-   Add an automated check if feasible (Playwright navigation test) or at minimum a manual QA checklist to verify highlighting persists after N back/forward navigations.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) (Next.js App Router).
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

---

[-]

[✨⟹] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)