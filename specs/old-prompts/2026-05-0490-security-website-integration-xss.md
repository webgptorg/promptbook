[-]

[🔐] Fix XSS on the Agents Server website-integration page

-   The website-integration page builds an HTML snippet by interpolating agent metadata into a single-quoted `meta='...'` attribute and then renders that snippet back into the page with `dangerouslySetInnerHTML`.
-   [`apps/agents-server/src/app/agents/[agentName]/website-integration/page.tsx`](apps/agents-server/src/app/agents/[agentName]/website-integration/page.tsx) currently uses `JSON.stringify(...)` to build the metadata payload, but JSON escaping does not make the value safe for a single-quoted HTML attribute, so metadata containing `'` can break the attribute context and inject markup or script.
-   The same file then renders the generated snippet through `dangerouslySetInnerHTML`, which turns the copyable example code into an execution sink instead of plain text.
-   This is exploitable for any authenticated user who visits the page for an agent whose metadata contains a crafted payload, and it creates a stored XSS path if agent metadata can be edited or imported from untrusted sources.
-   Fix this by treating the integration snippet strictly as escaped code, removing the debug `dangerouslySetInnerHTML` preview path, and using proper HTML-attribute escaping or a safer serialization channel for the generated `meta` payload.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
