[x] ~$0.00 6 minutes by GitHub Copilot `claude-sonnet-4.6`

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

---

[ ]

[⚡️🧽] Allow to send rapidly multiple messages

-   Now user can send multiple messages rapidly without waiting for server response, and the textarea will be cleared immediately on each send. This allows for a more fluid conversation flow, especially when user has multiple quick thoughts to share.
-   But when this happen, the second message fails with "Chat not found."
-   Fix the issue so that multiple messages can be sent rapidly without errors, and each message is processed correctly by the server.
-   Do a deep analysis of the current message sending flow and current functionality to identify the root cause of the "Chat not found" error when sending multiple messages rapidly.
-   You are working with the [Agents Server](apps/agents-server)
