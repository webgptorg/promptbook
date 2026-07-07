# Chats

The Agents Server supports two chat models with different persistence and execution guarantees. Both execute the agent as compiled from its [book](book-language.md) and share the behaviors listed at the end of this spec.

## 1. Stateless chat

The classic request/response model behind the agent chat page and embeds:

-   The client sends the full conversation state (message + optional thread + attachments + parameters) on every turn to `POST /agents/:agentName/api/chat`.
-   The server streams the reply back as markdown over the [streaming protocol](chat/streaming-protocol.md) and keeps **no authoritative conversation state** (only observability [history](chat/history-and-feedback.md) unless private mode).
-   The connection must stay open for the whole turn; a dropped connection loses the turn.

Full pipeline: [Stateless chat](chat/stateless-chat.md). The [OpenAI-compatible endpoints](api/openai-compatibility.md) are a second entry point into the same execution pipeline with OpenAI request/response shapes.

## 2. Durable user chats

Persistent, server-owned conversations for signed-in users:

-   Chats and messages are stored per user and agent (`prefix_UserChat`); each user turn enqueues a background **job** (`prefix_UserChatJob`) processed by [workers](operations/background-workers.md) independently of the client connection.
-   Clients observe progress by re-reading **canonical chat snapshots** over a newline-delimited snapshot stream; several viewers can watch the same turn.
-   Supports drafts, reply-references, titles, cancellation, retry, scheduled [timeouts](chat/timeouts.md), and [push notifications](users/settings-and-notifications.md#push-notifications).
-   Jobs are answered by an **agent runner**. The reference implementation mirrors queued jobs into a local agent folder where a coding-agent harness (`ptbk coder`) answers them; the job model is runner-agnostic (`provider` field).

Full pipeline: [User chats](chat/user-chats.md).

## Shared chat behavior

These rules apply to every chat execution path:

### Private mode

Clients may declare **private mode** (request header/cookie evaluated by `isPrivateModeEnabledFromRequest`). When enabled the server MUST NOT persist anything about the conversation: no [chat history](chat/history-and-feedback.md) records, no [self-learning](agents/self-learning.md) updates, no durable-chat access (durable endpoints answer HTTP 403 "Private mode is enabled."). The control panel exposes the toggle when `IS_CONTROL_PANEL_PRIVATE_MODE_ENABLED` metadata allows it.

### Failure message

When reply generation fails, the user-facing chat shows the configurable `CHAT_FAIL_MESSAGE` metadata text (default: "Sorry, I encountered an error processing your message. Please, try again later.").

### Thinking placeholder

While a reply is being composed, the UI shows a rotating placeholder chosen from the slash-delimited `THINKING_MESSAGES` metadata variants.

### Empty responses

A blank model response MUST be replaced by a non-empty fallback text before it is streamed/persisted, so chats never end with an empty bubble.

### Message suffix

When the book declares `MESSAGE SUFFIX`, its markdown is appended to every reply — streamed incrementally after the model output and included in the persisted content.

### Disclaimer gate

When the book declares `META DISCLAIMER`, chat endpoints MUST reject turns (HTTP 403, code `meta_disclaimer_required`) until the signed-in user has accepted the disclaimer; anonymous users cannot accept and are always rejected. Acceptance state is per user + agent (see [Public agent API](api/public-agent-api.md#meta-disclaimer)).

### Client version guard

Chat endpoints check an optional client-version header and answer with a structured "outdated client" response (stream- or JSON-shaped) instructing the UI to reload when the client build is older than the server's minimum.

### Attachments

File attachments are uploaded separately and referenced in messages; see [Attachments and files](chat/attachments-and-files.md).

### Visual modes and UI preferences

The chat UI renders in `BUBBLE_MODE` or `ARTICLE_MODE` (`CHAT_VISUAL_MODE` metadata default, user-overridable), with configurable enter-key behavior, sounds, vibration, and notifications — see [Settings and notifications](users/settings-and-notifications.md).

## Development/test surfaces

-   `GET /api/chat` and `GET /api/chat-streaming` are unauthenticated smoke tests of the configured LLM key and MUST be disabled in production builds.
-   Signed-in users can store **mocked chat presets** (`/api/system/mocked-chats`, UI under `/system/utilities/mocked-chats`) used to preview chat rendering without model calls.
-   Chat threads can be exported as PDF via `POST /api/chat/export/pdf` and citation labels resolved via `/api/chat/citation-label` (see [History and feedback](chat/history-and-feedback.md#export)).
