[ ]

[📏🧼] Fix chat viewport height to remove bottom whitespace

-   *(@@@@ Written by agent)*
-   On the agent chat page in [Agents Server](apps/agents-server) there is an issue where the chat layout sometimes leaves an ugly white space below the message composer (textarea), reducing the available height for the chat messages.
-   This typically happens on mobile browsers (especially iOS Safari / Android Chrome) when the URL/search bar is shown/hidden, because the effective viewport height changes.
-   Goal: the chat should always use space efficiently (messages area expands to maximum available size) regardless of fullscreen / not fullscreen and regardless of whether the browser URL bar is expanded/collapsed.
-   Remove any “two heights” workaround in CSS (e.g. separate constants for with/without URL bar) and replace it with a robust solution based on the real visible viewport.
-   Implement using modern viewport units and/or `VisualViewport` API:
    -   Prefer `100dvh` (dynamic viewport height) and/or `svh/lvh` where appropriate, with a fallback for older browsers.
    -   Consider a tiny JS helper that sets a CSS variable like `--app-height` to `window.visualViewport.height` (fallback to `window.innerHeight`) and update it on `resize` + `visualViewport.resize`.
    -   Use that variable for the root app container height and ensure children use flex layout (`display:flex; flex-direction:column;`) with the messages list using `flex: 1 1 auto; min-height:0; overflow:auto;` so it always stretches.
-   Ensure the message composer stays pinned to the bottom without creating extra scroll/whitespace.
-   Ensure safe-area insets are handled correctly (iPhone notch / home indicator): account for `env(safe-area-inset-bottom)` in padding/margins as needed.
-   Acceptance criteria:
    -   No visible white space below the composer on the chat page across resize/orientation changes.
    -   Toggling the browser URL bar (scrolling up/down) does not cause jumps that leave unused space.
    -   Works on iOS Safari, Android Chrome, and desktop browsers.
-   Add a small automated check / story (if feasible) or at least a manual QA checklist for: iOS Safari (with address bar visible/hidden), Android Chrome (address bar visible/hidden), desktop resize.
-   You are working with:
    -   [Agents Server](apps/agents-server)
    -   Chat page/layout component(s) @@@
    -   Global styles / layout CSS @@@
    -   Potential helper for CSS viewport sizing @@@
-   Add the changes into the [changelog](changelog/_current-preversion.md)
