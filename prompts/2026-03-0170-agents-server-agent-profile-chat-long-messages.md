[ ]

[✨🍾] Allow sending long initial chat messages from agent profile without URL length limits

-   Currently the agent profile chat transmits the user message via URL query parameter(s), which breaks for long messages due to URL length limits.
-   Change the implementation so the message is transmitted via request body (POST) or other non-URL mechanism, while keeping shareable deep-links working.
-   Proposed approach:
    -   Introduce an API endpoint to create a chat message / start a chat session from the agent profile (e.g. `POST /api/agents/{agentId}/chats` or similar) accepting `{ message: string, attachments?: @@@ }` in JSON.
    -   On send, call the endpoint, receive `{ chatId }` (and optionally first assistant response streaming token) and navigate to the chat page using a short URL (`/chat/{chatId}` or existing route) without embedding the message.
    -   Keep the existing URL-parameter based behavior only for small messages / backwards compatibility, or deprecate it with a safe fallback.
-   Ensure it works for:
    -   Very long messages (multiple pages of text)
    -   Non-ASCII characters and emojis
    -   Private/unlisted agents and anonymous users (if supported)
    -   Refresh/back navigation without losing the created chat
-   Add basic abuse protections: max message size limit on server, validation, and clear error message in UI when rejected.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with (at least):
    -   [apps/agents-server](@@@)
    -   Agent profile chat UI component (locate and update)
    -   Chat creation / routing logic (locate and update)
    -   API route(s) under `apps/agents-server/src/app/api` (or current structure)
-   If you need to do the database migration, do it
    -   Reuse existing chat/message tables if already present; do not add new storage unless needed
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)