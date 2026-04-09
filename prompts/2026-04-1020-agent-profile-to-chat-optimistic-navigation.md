[ ]

[🧠⚡] Optimistic navigation + immediate message when entering agent chat from agent profile

-   You are working with [Agent Profile → Chat components](apps/agents-server/src/app/agents/[agentName]/AgentProfileChat.tsx) and [full chat client](apps/agents-server/src/app/agents/[agentName]/chat/AgentChatHistoryClient.tsx)
-   When the user navigates from the agent profile page to the agent chat page (e.g., by clicking a quick action button or by typing/sending a message from the profile UI), the browser navigation and UI update must be processed optimistically and immediately
-   The chat page must show the user-sent message instantly (as soon as the user action happens), without waiting for server confirmation
-   The message should appear using the same mechanism used for a “new chat + first message” flow, so the behavior is consistent with how a new chat already shows the user message immediately
-   Do the LLM/server processing in the background after navigation, reconciling any pending/optimistic state with the server-owned canonical chat state once responses arrive
-   The current profile-to-chat flow already sets a pending profile message and performs a `router.push` to `/agents/[agentName]/chat`; ensure the chat page consumes that pending message and renders it as an optimistic outbound message immediately (instead of waiting for the server stream/history bootstrap)
-   Use the existing pending-message cache API (the profile side calls `setPendingProfileMessage`, and the chat side uses `takePendingProfileMessage`) to carry the message across the navigation boundary, and extend the handshake if needed to also handle attachments and chat-id selection correctly
-   Failure handling: if the background send fails, the optimistic user message must transition into a failed state with a retry affordance, matching the existing pending outbound reconciliation logic used by the chat client
-   Query-param/message entry: this should also work when profile sends via a message navigation target (if the implementation uses `?message=` or similar params); the final behavior must still render the outgoing user message immediately on first paint
-   Guardrails/edge cases
    -   Private mode: ensure the optimistic render works the same way as private chat new-message behavior
    -   History enabled vs disabled: ensure the message appears immediately regardless of whether server chat history needs to load
    -   Forced new chat vs existing chat: ensure the optimistic message is shown in the correct target chat context
-   Add/extend automated coverage
    -   Update the existing navigation test (`AgentProfileChat.navigation.test.ts`) or add a new integration-style test covering: profile quick-send triggers chat route, and the outgoing user message appears immediately before any mocked server response
    -   Ensure tests cover both “quick button” and “send typed message” entry points
-   Update the changelog entry in `changelog/_current-preversion.md` once the change is ready
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
