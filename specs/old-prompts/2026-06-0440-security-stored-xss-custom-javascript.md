[x] $0.9224 16 minutes by Claude Code

[🔐] Fix stored XSS vulnerability in Custom JavaScript admin feature of Agents Server

-   The Agents Server allows admins to inject custom JavaScript code that is stored in the database and served to all users on every page. In [`apps/agents-server/src/app/layout.tsx`](apps/agents-server/src/app/layout.tsx) line 382, the only sanitization applied is `customJavascript.replace(/<\/script>/gi, '<\\/script>')` — this only escapes closing `</script>` tags and is trivially bypassed using techniques such as HTML entities, event-handler attributes, or encoding tricks. The sanitized value is then rendered verbatim with `dangerouslySetInnerHTML` on line 451. Any admin who can set the custom JavaScript (or anyone who compromises the database or the admin account) can inject malicious JavaScript that executes in the browsers of all visitors, enabling session hijacking, credential theft, redirection to phishing pages, and more.
-   The fix should restrict the custom JavaScript feature more carefully. Options to evaluate (analyze the current use case before deciding): (1) Remove the `<script>`-injection approach entirely and document supported customization alternatives (e.g., custom CSS only), or (2) add a strict Content Security Policy (CSP) `nonce` on every `<script>` tag and configure `script-src 'nonce-...'` so that only nonces issued by the server are allowed — the current layout already adds a `<script>` tag for theme-mode bootstrap, so a nonce approach needs to cover that as well. The weak `</script>` escape on line 382 must be removed or replaced with a proper approach.
-   Related files:
    -   [`apps/agents-server/src/app/layout.tsx`](apps/agents-server/src/app/layout.tsx) lines 382 and 448–453 — where the custom JS is prepared and rendered
    -   [`apps/agents-server/src/app/admin/custom-js/`](apps/agents-server/src/app/admin/custom-js/) — the admin UI and state for managing the custom JavaScript
-   Do a proper analysis of the current functionality before you start implementing — understand what the custom JavaScript feature is used for in production and choose the fix that preserves legitimate functionality.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

