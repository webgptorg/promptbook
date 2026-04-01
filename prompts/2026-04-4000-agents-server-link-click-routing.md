[ ]

[🚧🧭] Fix Agents Server links not navigating (Next.js routing)

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   Problem: In the Agents Server UI, clicking links sometimes does nothing; expected behavior is that link clicks navigate/react normally (client-side routing).
-   Scope of investigation and fix (prefer minimal changes):
    -   Identify which clickable elements are affected (left menu items, agent profile links, chat/book links, context links, etc.) and whether they use `next/link`, `router.push`, raw `<a href>`, or a button-like component.
    -   Check for event handlers that prevent navigation (e.g., `preventDefault`, `stopPropagation`, overlay captures, pointer-events/CSS issues, or disabled elements).
    -   Verify that Next.js routes for the target URLs exist (and dynamic route segments match the link href format).
    -   Validate basePath / trailing-slash / locale / absolute-vs-relative href issues (and that links point to same-origin and correct paths).
    -   If links are rendered inside a modal/iframe/portal or within the chat streaming area, ensure the click target isn’t blocked by an overlay and that the navigation isn’t hijacked by scroll/focus management.
-   Acceptance criteria:
    -   For every link in the affected UI areas, clicking results in navigation to the correct route and the page content updates accordingly.
    -   No regression: chat input and streaming interactions still work; links still have expected hover/active states.
    -   Add at least one automated coverage path if a relevant test setup exists (otherwise add a clear repro test plan / manual QA checklist).
-   Deliverables:
    -   Code changes in the Agents Server routing/link components and/or layout wrappers.
    -   Optional: add a small dev-only logger/assertion behind a flag to detect click handlers that cancel navigation (only if helpful).
    -   Update the [changelog](changelog/_current-preversion.md) with the fix.
-   Open questions (need confirmation before final implementation):
    -   Which exact URLs/links are broken, and on which page(s) (include 3-5 concrete examples)?
    -   Does it fail on first click or only after some action (e.g., after starting a chat/tool call)?
    -   Browser/OS + whether this happens in incognito or production build.
