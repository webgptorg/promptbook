[ ]

[🧠🔔] Play sound/vibration only when the agent finishes responding

-   *(@@@@ Written by agent)*
-   The UI currently plays the “new message” sound/vibration too often (e.g., during streaming / intermediate updates). Update the notification trigger so sound + vibration are played only when the agent actually responds (i.e., when the assistant message is complete / finalized), not for partial chunks or other message lifecycle updates.
-   Keep existing user settings and notification permissions behavior unchanged.
-   Ensure the change covers both desktop notifications (sound) and mobile vibration (vibration), if both are implemented.
-   Add/adjust client-side logic in the chat message streaming / message finalization flow so notification is fired exactly once per completed agent response.
-   Add/adjust tests (unit/integration as appropriate) to verify notification fires:
    -   once when assistant message transitions to “complete/final”
    -   never for assistant message streaming chunks / intermediate states
    -   once per completed response even if UI rerenders
-   You are working with [Agents Server](apps/agents-server)
-   Unknown places to inspect in codebase: @@@
-   Please update the [changelog](changelog/_current-preversion.md) with a short entry about the fix.
