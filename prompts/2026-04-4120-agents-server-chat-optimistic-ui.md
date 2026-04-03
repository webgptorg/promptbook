[x] ~$0.00 2 hours by OpenAI Codex `gpt-5.3-codex`

[🌙🧩] Make chat actions optimistic *(instant open, instant message, instant new chat)*

-   You are working with [Agents Server](apps/agents-server)
-   Update the chat UX so key actions happen immediately without waiting for the server response:
    -   When creating a new chat, the UI should open the new chat view immediately (optimistic navigation + local placeholder state)
    -   When sending a message, the user message bubble should appear immediately in the chat (optimistic append)
-   Implementation requirements:
    -   While the server request is in-flight, show a lightweight "sending" / "pending" status on the optimistic message bubble (no blocking spinner that delays visibility)
    -   If the server fails, mark the optimistic message as "failed" and provide a retry action (or at minimum, a clear error state + allow user to resend)
    -   Ensure we don’t create duplicate messages when the server response arrives (placeholder replaced/merged by tempId/server id mapping)
    -   Ensure optimistic state is scoped correctly per chat/thread so switching chats does not leak pending items