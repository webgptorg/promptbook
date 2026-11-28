[x] ~$0.00 an hour by OpenAI Codex `gpt-5.4`

[✨🚐] Chat should exist independently of browser (multi-device, resilient, long-running)

-   The chat on the Agents Server must continue running and receiving assistant outputs even when the user closes the page, loses focus, crashes the browser, or loses the internet connection.
-   The chat must be identified by `chatId` and always show the same canonical state on 1–3 devices (phone/desktop/etc.), i.e. the UI is only a viewer/controller of a server-owned conversation.
-   Support long-running tasks (minutes → hours): if a message triggers work, that work must be executed server-side and the final (and optionally partial) outputs must be persisted into the chat history and visible after reconnect.
    -   For now, there is nothing such as a long-running in the current implementation, but in future it could be, and the implementation you are doing should be aware of this.
-   Preserve message ordering and idempotency: sending the same user message twice due to reconnect/retry must not duplicate work; define a `clientMessageId` (or similar) and deduplicate on the server.
-   Define and persist message lifecycle states (at least: `queued` → `running` → `completed` / `failed` / `cancelled`) and show them consistently across devices.
-   Streaming UX must be resilient: if streaming disconnects, client should rehydrate by fetching the canonical chat state and continue from the last known message/token boundary.
-   Saving the messages to `UserChat` should be decoupled from the HTTP request handling and happen progressively as the assistant generates output, not just at the end of the response or on a fixed interval. And also not be triggered by the client, but by the server as the assistant generates output.
-   Implement minimal server-side job execution model for chat turns:
    -   Each user message that requires assistant processing creates a durable job record linked to `chatId` and `messageId`.
    -   Jobs are processed by a worker that is not tied to the HTTP request lifecycle (We are deployed on Vercel).
    -   Worker writes assistant messages to DB progressively or at completion.
-   Add ability to reconnect: client loads for example `https://pavol-hejny.ptbk.io/agents/JFVnC1CNYvz8NA/chat?chat=SGxXyU78ySyBPY` and server returns full chat history + any active job statuses.
    -   In this example, `JFVnC1CNYvz8NA` is the agent id and `SGxXyU78ySyBPY` is the chat id.
-   Add minimal cancellation semantics (even if only for admins/dev for now): user can cancel a `running` job; the final state is recorded and shown in history.
-   Security/ownership: access to `chatId` must respect current auth rules (anonymous vs logged-in) and not leak chat histories across users
-   Observability: log job starts/ends/errors with `chatId`, `messageId`, duration, and provider used; store failure reason in chat.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality how the chat system works, user chats are handled and other related aspects before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   You don’t need to keep backward compatibility, if the current implementation is not supporting theese scenarios, it is ok to break it and implement the new functionality in the way that supports theese scenarios, it is not required to keep the old functionality working if it is not supporting theese scenarios.
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$1.22 24 minutes by OpenAI Codex `gpt-5.4`

[✨🚐] You have implemented chats that are running on the background, but there are several minor issues

-   You have implemented this in `60b78a4f1c2d8a6790c5b2def86b6197db1bc9b7`
-   You have broken chat streaming, the agent response is not streaming, it should be streamed to all the clients that are looking on the same chat, but still independently running on the background
-   Show loading messages from `THINKING_MESSAGES`
-   Chat messages are often finished but still in `RUNNING` state pending indefinitely
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality and the commit `60b78a4f1c2d8a6790c5b2def86b6197db1bc9b7` before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it

---

[x] ~$1.83 33 minutes by OpenAI Codex `gpt-5.4`

[✨🚐] You have implemented chats that are running on the background, but the streaming is not working well

-   You have broken chat streaming, the agent response is not streaming, it should be streamed to all the clients that are looking on the same chat, but still independently running on the background
-   Chats are now independent from the browser - this is awesome
-   But still, when the user has the browser focus, the streaming and UX of the streaming should work the same as before.
-   As the chat message is being streamed token by token, there should be the slight vibration as it was before.
-   The streaming should work for all the clients which have currently focused and opened the tab with that chat
-   Show loading messages from `THINKING_MESSAGES`, This should be shown from the browser and cycled dynamically and randomly as before
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality and the commit `60b78a4f1c2d8a6790c5b2def86b6197db1bc9b7`, [PRD file](prompts/2026-03-0600-agents-server-chat-independent-of-browser-and-devices.md) before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it

---

[-]

[✨🚐] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚐] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

