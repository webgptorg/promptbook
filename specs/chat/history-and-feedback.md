# History and Feedback

Two observability logs for [stateless-style](stateless-chat.md) conversations: **chat history** (a frozen record of every turn, for operators) and **chat feedback** (explicit user ratings). Neither is conversation state — durable state lives in [user chats](user-chats.md). Both are per-instance tables: `prefix_ChatHistory`, `prefix_ChatFeedback` ([Data model](../data-model.md#conversations)).

## Chat history

Every stateless/OpenAI-compatible turn writes two entries (user message, then model reply) unless [private mode](../chats.md#private-mode) is enabled:

-   **Hash chain** — each entry has a `messageHash`; the reply entry carries `previousMessageHash` of the user entry (and subsequent turns chain onward), so a conversation can be reconstructed and tamper-evidently ordered without storing the thread.
-   **Message payload** — JSON `{ role, sender, content, attachments? }`; the reply includes the appended [message suffix](../chats.md#message-suffix) and records `usage`.
-   **Context columns** — agent identity (`agentPermanentId` FK + denormalized `agentName`, `agentHash`), request context (`url`, `ip`, `userAgent`, `language`, `platform`), `source` (`AGENT_PAGE_CHAT` | `OPENAI_API_COMPATIBILITY`), `actorType` (`ANONYMOUS` | `TEAM_MEMBER` | `API_KEY`), `apiKey` when token-authenticated, `userId` when signed in.

### Administration

-   `GET /api/chat-history` (admin) — filterable listing (per agent, pagination) backing `/admin/chat-history`.
-   `DELETE /api/chat-history` / `DELETE /api/chat-history/:id` (admin) — bulk/single purge.
-   `GET /api/chat-history/export[?agentName=…]` (admin) — CSV download (`chat-history-<agent>-<timestamp>.csv`).

## Feedback

`POST /agents/:agentName/api/feedback` (public — anonymous visitors may rate): body `{ agentHash, rating, textRating, chatThread, userNote, expectedAnswer }`. The server stores the rating with the serialized thread and the same request-context columns as history.

-   The feedback UI mode is configured by the `CHAT_FEEDBACK_MODE` metadata key (e.g. `stars`), with `IS_FEEDBACK_ENABLED` as the legacy toggle ([Configuration](../configuration.md#chat-behavior)).
-   Admin surfaces mirror history: `GET/DELETE /api/chat-feedback[…]`, CSV export at `/api/chat-feedback/export`, UI `/admin/chat-feedback`.

## Related chat utilities

-   **Citation labels** — `POST /api/chat/citation-label` resolves a friendly label for a citation source URL found in replies (bounded input length; used by the chat renderer to prettify knowledge citations).
-   **PDF export** — `POST /api/chat/export/pdf` renders a chat thread (client-supplied messages + title) to a downloadable PDF via server-side HTML rendering.
-   **Mocked chats** — signed-in users can store mock conversation presets (`/api/system/mocked-chats`, UI `/system/utilities/mocked-chats`) to preview chat rendering without model calls ([Chats § Development/test surfaces](../chats.md#developmenttest-surfaces)).
