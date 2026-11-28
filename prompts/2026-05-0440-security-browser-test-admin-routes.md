[-]

[🔐] Fix unauthenticated browser-test automation routes of Agents Server

-   The Agents Server browser-test feature is exposed through admin UI at [`apps/agents-server/src/app/admin/browser-test/page.tsx`](apps/agents-server/src/app/admin/browser-test/page.tsx), but the API routes used by this feature do **not** repeat the admin authorization check. Any anonymous client can call these routes directly and make the server start Playwright browser sessions, stream screenshots, and call OpenAI with `process.env.OPENAI_API_KEY`.
-   Affected routes:
    -   [`apps/agents-server/src/app/api/browser-test/act/route.ts`](apps/agents-server/src/app/api/browser-test/act/route.ts) accepts unauthenticated `POST` requests, starts a server-side browser via `$provideBrowserForServer`, sends page state to OpenAI `gpt-4o`, and executes model-generated actions. The `navigate` action calls `page.goto(act.url)` without applying `assertSafeUrl`, so the route can be abused for server-side browsing, SSRF-style probing, unwanted third-party interaction, and OpenAI credit exhaustion.
    -   [`apps/agents-server/src/app/api/browser-test/scroll-facebook/route.ts`](apps/agents-server/src/app/api/browser-test/scroll-facebook/route.ts) exposes an unauthenticated screenshot stream with `while (just(true))`, no admin guard, no rate limit, and no request-abort handling. Attackers can keep many browser-backed streams open indefinitely.
    -   [`apps/agents-server/src/app/api/browser-test/screenshot/route.ts`](apps/agents-server/src/app/api/browser-test/screenshot/route.ts) exposes unauthenticated Playwright screenshot creation and deliberately keeps the shared browser alive after the response.
-   The fix should require `isUserAdmin()` or an equivalent admin-only guard in every `/api/browser-test/*` route before creating a browser page, reading screenshots, or calling OpenAI. The server-side route guards must match the admin-only intent of the UI page; hiding the page is not enough.
-   Apply the same resource protections to all browser-test routes: per-admin rate limits, request body size limits, maximum stream duration, `request.signal` cancellation, and guaranteed cleanup of browser pages/transports when the client disconnects.
-   Validate every URL before the browser can navigate to it. Reuse the existing safe URL / SSRF guard patterns used by page-preview and scrape routes instead of allowing raw `page.goto` from the request body or from model output.
-   Add tests or route-level assertions that anonymous users receive `401`/`403`, non-admin signed-in users receive `403`, admin users can still use the Browser Test page, and unsafe navigation targets are rejected before Playwright receives them.
-   Do a proper analysis of the current functionality before you start implementing. Confirm whether these routes are still needed outside local development; if they are purely diagnostic, consider disabling them in production or keeping them behind the same admin feature gate as the UI.
-   Keep in mind the DRY _(don't repeat yourself)_ principle and the SOLID principles. Share one browser-test authorization/resource guard instead of copying partial checks between route handlers.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

