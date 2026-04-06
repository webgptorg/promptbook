[x] ~$1.22 29 minutes by OpenAI Codex `gpt-5.4`

[🚀💬] Optimistic first message from agent profile page to chat page

-   When a user starts a new chat from the agent profile page (and other entry points like textarea page), the chat thread and initial agent message are shown immediately, but the user’s first message (typed on the previous page) appears only after a delay (as if loaded from server). This creates a confusing “missing message” moment.
-   Goal: always render the user’s first message immediately on the chat page as `queued` / `pending` (optimistic UI), while the server request is in-flight; later reconcile with the canonical message returned by server.
-   Primary UX requirement: right after navigation to chat page, there are always two messages visible:
    -   the initial agent message (existing behavior)
    -   the user’s first message (new optimistic/pending behavior)
-   The optimistic message must show a clear state (choose one): `sending`
-   After server confirms message creation, replace the optimistic message with the real one (same content) without flicker/jump; preserve scroll position.
-   If server fails to persist/send the message, keep the optimistic bubble but mark as `failed`
-   Deduping: ensure the optimistic message is not duplicated when the server-loaded transcript arrives.
    -   Alternatively (fallback) dedupe by (chatId + author + text + timestamp window) but prefer explicit id.
-   Works for these entry points:
    -   Agent profile page → new chat
    -   Textarea page → new chat
    -   Any other flow where message is composed before entering `/chat`
-   Non-goals:
    -   Do not introduce complex offline queueing; only optimistic rendering for the first message of a newly created thread
-   Technical notes / approach:
    -   Introduce a shared “pending outbound messages” store in client state (e.g. Zustand/Redux/React context) scoped by `chatId`.
    -   On navigation to chat page, seed the store with `{tempId, text, createdAt, status: 'pending'}` when starting chat.
    -   In chat page data loader/hook, merge pending outbound messages into the message list before rendering.
    -   When server messages load/stream in, reconcile: match by `tempId` (preferred) then mark pending as confirmed or remove.
-   Edge cases:
    -   User hits back/forward during send: Chats are append-only
    -   Hard refresh before server confirms: just show the real messages from server (optimistic is only for in-session navigation)
    -   Very slow server: pending bubble should remain indefinitely with progress indication
-   Add/extend tests:
    -   E2E: start chat from profile page with prefilled text; assert both messages visible immediately; later assert pending becomes confirmed.
    -   Unit: reconciliation/dedup logic for `tempMessageId` mapping.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[🚀💬] When clicking on quick button in chat it should be immediatelly optimisticly sended into chat in same way as writing throught textarea

-   You are working with the [Agents Server](apps/agents-server)
