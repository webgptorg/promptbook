[ ]

[📍🧩] Fix navigation from agent pages (profile -> chat) doing nothing

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   Problem: On agent profile page (example: https://s6.ptbk.io/agents/hKs8wGS2xc5GhF/...), clicking navigation links (e.g. “My chats”, quick buttons, “Writing a message and send”, etc.) does nothing: no loading indicator, no route change, UI may fade briefly and then stays on the profile page.
-   Repro notes from report:
    -   URL examples: https://s6.ptbk.io/agents/hKs8wGS2xc5GhF/chat?chat=HkfqGyiefo8AzY and https://s6.ptbk.io/agents/hKs8wGS2xc5GhF/...
    -   Expected: client-side navigation to the /chat page for the same agent (and optionally open the chat indicated by query params like chat=@@@).
    -   Actual: click handler sometimes does not trigger navigation (or navigation occurs but fails / is immediately overwritten).
-   Requirements:
    -   Always perform navigation to the target /agents/<agentId>/chat route when user clicks the agent-page navigation UI.
    -   Add deterministic click handling (disable/remove event handlers that can swallow clicks) and ensure the link/button triggers exactly one navigation action.
    -   Add clear UX feedback on click (at minimum: loading/skeleton/progress UI + correct aria/busy state) so users understand something is happening.
    -   Add logging for navigation failures (console + optional server correlation id) to make it debuggable in production.
    -   Ensure navigation works for both:
        -   direct links to /chat (with/without query params)
        -   internal buttons that are supposed to “send prefilled message” then open the corresponding chat.
-   Implementation guidance:
    -   Do a proper analysis of current functionality before you start implementing.
    -   Locate the agent profile page components and the routing layer used for client-side navigation (Next.js router / link abstraction / history push).
    -   Confirm whether the navigation is implemented via <a>, Next <Link>, router.push(), or custom onClick handlers.
    -   Check for conditions that prevent navigation (disabled state, overlay capturing pointer events, focus traps, preventDefault/stopPropagation, overlays/modals).
-   Acceptance criteria:
    -   Clicking navigation items on an agent profile page always navigates to the chat page (within normal client-side navigation latency).
    -   When navigation has a known precondition (e.g. chat must be created first), the UI shows loading and then arrives at the chat page.
    -   No more “click does nothing” repro on the provided agent page.
    -   Add at least one regression test (unit/integration/e2e depending on existing test setup) that simulates clicking the navigation items and verifies the URL changes to /agents/<agentId>/chat.
-   Add note/update to changelog in `changelog/_current-preversion.md` describing the fix.

-   *(@@@@ Written by agent)*
