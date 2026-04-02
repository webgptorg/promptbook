[ ]

[🌙🧩] Make chat actions optimistic (instant open + instant message)

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   Update the chat UX so key actions happen immediately without waiting for the server response:
    -   When creating a new chat, the UI should open the new chat view immediately (optimistic navigation + local placeholder state)
    -   When sending a message, the user message bubble should appear immediately in the chat (optimistic append)
-   Implementation requirements:
    -   The optimistic UI should use a temporary client-generated message id ("tempId") so the eventual server response can replace/update the placeholder deterministically
    -   While the server request is in-flight, show a lightweight "sending" / "pending" status on the optimistic message bubble (no blocking spinner that delays visibility)
    -   If the server fails, mark the optimistic message as "failed" and provide a retry action (or at minimum, a clear error state + allow user to resend)
    -   Ensure we don’t create duplicate messages when the server response arrives (placeholder replaced/merged by tempId/server id mapping)
    -   Ensure optimistic state is scoped correctly per chat/thread so switching chats does not leak pending items
-   Entry points / code touchpoints to update (to be confirmed in repo):
    -   Chat creation flow (route handler + client navigation)
    -   Chat message submit handler (button submit / enter key submit)
    -   Chat state store (React state / context / zustand / redux) and message list rendering
    -   WebSocket/SSE/streaming integration (if any) so optimistic pending items do not break streaming
-   Testing/acceptance:
    -   Cypress/Playwright: create chat and immediately see it opened (no loading wait)
    -   Cypress/Playwright: send message and immediately see your message bubble before server returns
    -   Simulate server error and verify the optimistic bubble shows failed state and can recover

-   Add changelog entry to [changelog/_current-preversion.md] (if applicable)
