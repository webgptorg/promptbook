[ ]

[🎯🪟] Allow opening a new chat window via right-click context menu

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   Add a context-menu entry on chat-related UI (right click) to open a *new window/tab* with the chat route configured to create a fresh chat session (example: `.../chat?chat=new`)
-   The feature should work from the current chat page and any UI element that represents “start new chat” for a given agent
-   The new window should preserve the agent/user context, and should not reuse the current window’s chat session state
-   Implementation details:
    -   Detect the current agent id from the route / page state
    -   Generate the “new chat” URL using the same base used by the existing `chat?chat=new` behaviour (exact URL parts: @@@)
    -   Wire to `window.open(url, '_blank', ...)` (or equivalent) behind a user gesture so browsers allow popups
    -   Ensure routing hydration does not break streaming / message updates in the opened window
-   UX requirements:
    -   Context menu item label: “Open new chat in new window” (or @@@)
    -   If the current page is not in a state that supports opening a chat for the selected agent, hide/disable the entry
-   QA / test cases:
    -   Right-click → open new window → verify a fresh chat starts (no messages from current chat)
    -   Streaming response works in the new window
    -   Open multiple new chat windows simultaneously
    -   Verify correct behavior on mobile (context menu may be replaced by a long-press menu; confirm @@@)
-   Update changelog entry in [changelog/_current-preversion.md](changelog/_current-preversion.md)

Sourcing notes:
-   @@@

This commit message will reference the final implemented change.
