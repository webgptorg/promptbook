[-]

[🔐] Fix unauthenticated Playwright PDF rendering in `/api/chat/export/pdf` of Agents Server

-   [`apps/agents-server/src/app/api/chat/export/pdf/route.ts`](apps/agents-server/src/app/api/chat/export/pdf/route.ts) accepts a `POST` body containing `title`, `messages`, and `participants`, builds HTML with `buildChatHtml(...)` and renders it to PDF on the server through `renderHtmlToPdfOnServer` (a Playwright-backed helper). The route performs **no authentication check** and **no rate limiting**, and the caller fully controls the HTML payload that Playwright opens.
-   Three problems:
    1.  Resource exhaustion / cost DoS: Playwright is heavy (multi-second CPU + memory per render). An attacker can submit very large `messages` arrays repeatedly to exhaust the server.
    2.  Server-side request forgery via embedded resources: the rendered HTML can reference `<img>`, `<link>`, fonts, or `<iframe>` pointing at internal URLs; Playwright will follow them. There is no `assertSafeUrl`-style guard.
    3.  Reflected XSS / phishing primitive: the produced PDF is returned with `Content-Disposition: attachment; filename="<title>"` where `title` is interpolated unquoted into the header — see `createChatExportFilename`. A title containing `"` or CRLF can break the header (header-injection / response-splitting in older proxies, or a misleading filename presented to the user).
-   The fix should:
    1.  Require authentication (`getCurrentUser()` at minimum) before triggering any PDF render, and add per-user rate limiting.
    2.  Configure the headless browser used by `renderHtmlToPdfOnServer` to block external network requests (or restrict the navigation to a `data:`/`file:` URL with no inline external fetches), so the renderer cannot be tricked into hitting internal hosts.
    3.  Apply the existing `assertSafeUrl` helper to any URL inlined into the HTML (avatar URLs, citation links, embedded images) **before** they reach the renderer.
    4.  Sanitize / quote-escape the `filename` value that lands in the `Content-Disposition` header (the standard pattern is RFC 5987 `filename*` with percent-encoding) inside `createChatExportFilename` or at the route boundary.
-   Do a proper analysis of the current functionality before you start implementing — read [`renderHtmlToPdfOnServer`](apps/agents-server/src/utils/chatExport/renderHtmlToPdfOnServer.ts) and the existing markdown sanitization PRD [`2026-05-0480-security-markdown-html-xss.md`](prompts/2026-05-0480-security-markdown-html-xss.md), and ensure the PDF path uses the same hardened HTML sanitizer as the on-screen renderer.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
