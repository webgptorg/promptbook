[x] ~$0.00 an hour by GitHub Copilot `gpt-5.4`

---

[x] (2 attempts) ~$0.00 an hour by GitHub Copilot `gpt-5.4`

[🔥🧠] Optimistic navigation from agent profile to agent chat with immediate user message

-   The agent chat page should appear immediately after the user triggers navigation from the agent profile page (e.g., by pressing a quick button or submitting a first message), without waiting for server confirmation.
-   I mean transition from Agent profile `/agents/master` to Chat page `/agents/master/chat?chat=...`
-   The typed user message must be rendered in the chat immediately, matching the “new chat + send message” behavior (optimistic message bubble), while the server request/processing continues in the background.
-   The background processing must reconcile with the server response: replace or update the optimistic message (status, temp id, streaming state) and then render the assistant response when it arrives.
-   The UI must handle navigation + streaming consistently (no duplicated messages, correct ordering, correct auto-scroll behavior).
-   If the server ultimately rejects the message or the request fails, update the optimistic message to an error state (and optionally allow retry), without breaking the already-visible chat.

