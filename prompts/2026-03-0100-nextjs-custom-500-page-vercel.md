[ ]

[🧯🌩️] Custom 500 page in Next.js on Vercel

-   *(@@@@ Written by agent)*
-   Goal: Add a custom, branded “500 / Internal Server Error” experience for the @@@ Next.js app deployed on Vercel, so unexpected server-side failures do not show a default/plain error page.
-   Use the correct Next.js mechanism based on router:
    -   Pages Router: add `pages/500.tsx`.
    -   App Router: implement global error handling via `app/error.tsx` (and optionally `app/global-error.tsx` if applicable) and ensure it covers server/render failures.
    -   If the project contains both routers, clearly decide precedence + ensure consistent UX across both.
-   UX requirements for the 500 page:
    -   Clear headline (“Something went wrong”) + short explanation.
    -   Primary action: “Reload page”.
    -   Secondary actions: “Go home” and optionally “Contact support” (mailto/link) @@@.
    -   Keep the styling consistent with the app design system (colors, typography, spacing).
    -   Ensure the UI works well on mobile.
-   Observability / debugging requirements:
    -   Show a non-sensitive error reference id (request id / trace id) when available, otherwise generate a lightweight client id for the session @@@.
    -   Log the underlying error to the existing logging pipeline @@@ (Sentry / Logtail / console / custom backend), ensuring no secrets are leaked.
    -   For App Router `error.tsx`, call `reset()` appropriately to allow recovery after transient failures.
-   SEO / caching:
    -   Ensure 500 pages are not indexed (add `noindex` where appropriate, or via metadata/headers) @@@.
    -   Confirm behavior on Vercel edge/runtime (Node vs Edge) is compatible with how errors are thrown/handled in the app.
-   Acceptance criteria:
    -   Triggering an intentional server error in production-like build shows the custom 500 UI instead of the default Next.js/Vercel error screen.
    -   “Reload page” works and, when the error is transient, the app recovers.
    -   Error is captured in logs with a reference id and stack trace (where permitted) @@@.
    -   Lighthouse / basic accessibility checks pass for the 500 page (keyboard navigation, contrast, readable headings).
-   Implementation notes / project touchpoints:
    -   You are working with [@@@ Next.js app location](@@@)
    -   Update or add tests @@@ (Playwright/E2E): a route that throws and expectation that the 500 UI renders.
    -   Add the changes into the [changelog](changelog/_current-preversion.md)
-   Out of scope:
    -   Custom 404 page (unless already missing) @@@.
    -   Building a full incident/support workflow.
