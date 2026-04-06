[ ] !

[⚡️🧽] Optimistically clear chat message textarea immediately on send

-   You are working with [Agents Server](apps/agents-server)
-   The chat composer currently behaves like: it optimistically sends the message but the message textarea becomes editable only after the server confirms.
-   Change UX so that the textarea is cleared immediately when user hits **Send** (optimistic send), not waiting for server response.
-   Keep behavior consistent with existing optimistic message flow (no double send, no text loss).
-   When server returns failure:
    -   Do not restore the failed message text back into the textarea (it is already in the chat as a message), just show error state in the chat (this is already existing behavior).
-   When multiple sends happen quickly:
    -   Subsequent messages should use the latest textarea content without being blocked by the previous request’s lifecycle.
-   Ensure keyboard flow remains correct:
    -   Enter key + Shift+Enter behavior must not be affected by this change
