
[🖱️📂] Fix accidental clicking into hover-opened menu

-   *(@@@@ Written by agent)*
-   Overview: Prevent the hover-opened menu from blocking clicks on page content while preserving fast, discoverable menu access; guarantee perfect UX for both: (1) intentionally opening and using the menu, (2) moving the mouse across the top and clicking page content without accidental clicks being captured by the menu.

-   Problem summary:
    -   Currently the app opens menu items on hover with a visible delay and leaves them interactive; when a user moves the mouse from the top toward the page content, the hover-opened dropdown can sit above content and catch clicks that were intended for the page.
    -   This results in accidental clicks inside the menu and a frustrated UX when users try to click content under a transient menu.
    -   Context: Agents Server menu structure and behavior referenced in common project notes for the app. 

-   Goals (success criteria):
    -   Hover should remain a lightweight preview that does not block page interactions unless the user commits to the menu.
    -   Click-to-open should be fully interactive and stable for users who intentionally open and use the menu.
    -   Mouse movement from top to page should never result in accidental menu clicks on underlying elements.
    -   Maintain keyboard & screen-reader accessibility.

-   Proposed solution (high level):
    -   Maintain two menu modes: hover-preview and active (committed) menu.
        -   hover-preview: menu is visible but inert (does not receive pointer events) until the user actually enters the menu area with the pointer.
        -   active (committed): menu is interactive (pointer-events enabled). Activated by explicit click on the menu trigger or by pointer entering the menu area while hover-preview is shown (user intent).
    -   Implementation details:
        -   Add menu state: { open: boolean, mode: 'hover' | 'click' | 'active' }
        -   When the user causes a hover-open (mouse enters trigger for > N ms), open menu in mode='hover' and set CSS pointer-events: none on the dropdown container (so it is visually visible but does not block underlying clicks).
        -   When the pointer actually moves inside the dropdown (mouse enter on dropdown), switch mode to 'active' and set pointer-events: auto so user can interact normally.
        -   Clicking the menu trigger toggles menu open in mode='click' and immediately enables pointer-events: auto.
        -   On global mousedown/touchstart outside menu when mode is 'hover' — do nothing special (the click passes through because pointer-events:none). If the event lands on page content, it will work normally; if it lands on the trigger, handle accordingly.
        -   On global mousedown/touchstart outside menu when mode is 'click' or 'active' — close the menu immediately.
        -   Add a short hover delay for opening preview (e.g., 120-200ms) to avoid flicker while keeping the UI responsive.
        -   Add accessible keyboard handling: focusing the trigger with keyboard should open menu in 'active' mode (pointer-events auto equivalent behavior) so keyboard users can navigate.
    -   Visual affordances:
        -   For hover-preview mode apply subtle visual treatment (slightly transparent background / subtle shadow) and a small label/tooltip like "Preview — click to open" (optional) to communicate that the menu is not currently interactive.
        -   Ensure transition feels native and fast.

-   Files / components to change (placeholders where unknown):
    -   apps/agents-server/src/components/@@@TopMenu / Menu / Dropdown component(s) @@@
    -   apps/agents-server/src/styles/menu.css or relevant styled-components / tailwind classes @@@
    -   apps/agents-server/src/hooks/useHoverIntent.ts (create small reusable hook for hover-intent timing) @@@
    -   apps/agents-server/src/utils/accessibility.ts (keyboard focus handling) @@@

-   Acceptance criteria / test cases:
    -   Hover preview opens visually after configured delay, but clicks on underlying content work while preview is shown.
    -   If user moves pointer into the dropdown, the menu becomes interactive and user can click items.
    -   Clicking the trigger always opens the menu in interactive mode immediately.
    -   When menu is interactive, a click outside closes it and does not allow click-through (standard behavior).
    -   Keyboard: focusing trigger opens interactive menu and arrow/tab navigation works inside menu.
    -   Unit/E2E: Add tests simulating mouse move from top to centered content and clicking — assert click is received by center element (not menu). Add test for click-to-open and menu item click handling.

-   Non-functional requirements:
    -   Minimal bundle size impact: implement small reusable hooks and CSS changes only.
    -   No change to server APIs.
    -   Keep behavior consistent across modern desktop browsers; mobile should keep click-to-open behavior (hover not applicable).

-   Metrics & verification:
    -   Manually verify scenarios described by QA and product:
        1) Open menu via click -> choose item -> works without accidental closure.
        2) Move mouse from top to middle -> click element under previous dropdown position -> click reaches element.
    -   Add short user testing session (3–5 users) to confirm reduction in accidental menu clicks.

-   Rollout plan:
    -   Small feature branch with toggle behind client feature flag (optional) so it can be A/B tested.
    -   Deploy to staging, run automated tests + manual QA for desktop interactions.

-   Unknowns / placeholders to clarify:
    -   Exact component paths and current menu implementation details @@@
    -   Preferred hover-open delay (default suggestion: 120ms) — confirm with UX @@@

-   Implementation estimate:
    -   Analysis & design: 0.5 day
    -   Dev + unit tests: 1.5–2 days
    -   E2E tests + QA & staging validation: 1 day


[🖱️📂] Fix accidental clicking into hover-opened menu

-   Code changes:
    -   Implement new hook useHoverIntent(ms) and add open-mode state to the dropdown component.
    -   Toggle pointer-events CSS property according to mode.
    -   Add integration tests and e2e scenarios (Cypress / Playwright) that validate click-through behavior.

This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
