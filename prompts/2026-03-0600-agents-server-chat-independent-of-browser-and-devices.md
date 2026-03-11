[ ]

[✨🚐] Chat should exist independently of browser (multi-device, resilient, long-running)

-   *(@@@@ Written by agent)*
-   The chat on the Agents Server must continue running and receiving assistant outputs even when the user closes the page, loses focus, crashes the browser, or loses the internet connection.
-   The chat must be identified by `chatId` and always show the same canonical state on 1–3 devices (phone/desktop/etc.), i.e. the UI is only a viewer/controller of a server-owned conversation.
-   Support long-running tasks (minutes → hours): if a message triggers work, that work must be executed server-side and the final (and optionally partial) outputs must be persisted into the chat history and visible after reconnect.
-   Preserve message ordering and idempotency: sending the same user message twice due to reconnect/retry must not duplicate work; define a `clientMessageId` (or similar) and deduplicate on the server.
-   Define and persist message lifecycle states (at least: `queued` → `running` → `completed` / `failed` / `cancelled`) and show them consistently across devices.
-   Streaming UX must be resilient: if streaming disconnects, client should rehydrate by fetching the canonical chat state and continue from the last known message/token boundary (implementation detail @@@).
-   Implement minimal server-side job execution model for chat turns:
    -   Each user message that requires assistant processing creates a durable job record linked to `chatId` and `messageId`.
    -   Jobs are processed by a worker that is not tied to the HTTP request lifecycle (queue/cron/background worker inside the server deployment @@@).
    -   Worker writes assistant messages to DB progressively or at completion.
-   Ensure concurrency control: only one active assistant run per `chatId` at a time (or clearly define parallelism rules and how interleaving is displayed @@@).
-   Add ability to reconnect: client loads `/chat/:chatId` and server returns full chat history + any active job statuses.
-   Add minimal cancellation semantics (even if only for admins/dev for now): user can cancel a `running` job; the final state is recorded and shown in history.
-   Security/ownership: access to `chatId` must respect current auth rules (anonymous vs logged-in) and not leak chat histories across users (details @@@).
-   Observability: log job starts/ends/errors with `chatId`, `messageId`, duration, and provider used; store failure reason in chat.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   You will likely touch:
    -   Chat UI and data fetching/rehydration logic (apps/agents-server frontend @@@)
    -   Chat API endpoints (apps/agents-server backend @@@)
    -   DB schema for chat messages / runs / jobs (Prisma schema or equivalent @@@)
    -   Background processing / queue integration (apps/agents-server @@@)
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