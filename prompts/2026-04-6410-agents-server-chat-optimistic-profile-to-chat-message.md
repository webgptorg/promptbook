[ ]

[🔥🧠] Optimistic navigation from agent profile to agent chat with immediate user message

-   *(@@@@ Written by agent)*
-   The agent chat page should appear immediately after the user triggers navigation from the agent profile page (e.g., by pressing a quick button or submitting a first message), without waiting for server confirmation.
-   The typed user message must be rendered in the chat immediately, matching the “new chat + send message” behavior (optimistic message bubble), while the server request/processing continues in the background.
-   The background processing must reconcile with the server response: replace or update the optimistic message (status, temp id, streaming state) and then render the assistant response when it arrives.
-   The UI must handle navigation + streaming consistently (no duplicated messages, correct ordering, correct auto-scroll behavior).
-   If the server ultimately rejects the message or the request fails, update the optimistic message to an error state (and optionally allow retry), without breaking the already-visible chat.
-   Testing:
    -   Add/extend an E2E test that starts on an agent profile page, triggers navigation to chat via “write message” or a quick action, asserts that the user message bubble is present before any mocked/slow server response is returned, then asserts the assistant response appears after the server response.
    -   Add a unit/component test for optimistic message insertion and reconciliation logic.
-   Implementation entry points:
    -   You are working with the [Agent Chat](apps/agents-server) UI route and chat state management (the canonical chat client state used for new chats).
    -   You are working with the agent profile page navigation actions and the code that currently performs server-first navigation/initial message sending.

Note: The PRD focuses on optimistic first-message + optimistic transition when coming from profile; it should reuse the same chat state machinery that already powers optimistic behavior in new chats.

Sources: use existing optimistic chat behavior as reference from the previously implemented feature for “optimistic first message from profile to chat”.