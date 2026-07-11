# Stateless Chat

`POST /agents/:agentName/api/chat` executes one conversational turn with an agent and streams the reply over the [streaming protocol](streaming-protocol.md). The client owns the conversation state. This is the endpoint behind the public chat UI, embeds, and same-server `TEAM` calls.

## Request

```jsonc
{
    "message": "string (required)",          // current user input
    "thread": [ /* ChatMessage[] */ ],        // optional prior conversation
    "attachments": [ /* normalized refs */ ], // optional uploaded-file references
    "parameters": { "key": "value" }          // optional prompt parameters
}
```

-   `OPTIONS` answers 200 with permissive CORS (`*`, methods `GET, POST, OPTIONS`, headers `Content-Type, X-Promptbook-Team-Agent-Access-Token`).
-   The route MUST allow long executions (reference implementation: 300 s platform maximum).

## Pre-stream validation (JSON error responses)

Failures before streaming return `{"error": {"message", "type"}}`:

| Condition | Status | `type` |
| --- | --- | --- |
| Outdated client build (version guard) | structured reload response | — |
| `PRIVATE` agent without permitted identity ([visibility](../agents.md#visibility); team token accepted) | 403 | `forbidden` |
| Agent soft-deleted | 410 | `agent_deleted` |
| Malformed JSON body / invalid `message` | 400 | `invalid_request_error` |
| [Disclaimer](../chats.md#disclaimer-gate) not accepted | 403 | `meta_disclaimer_required` |
| Unexpected resolution error | 400 | serialized error JSON |

## Execution pipeline

1. **Agent resolution** — the identifier (name, permanentId, or [book-scoped](../agents.md#book-scoped-sub-agents) `parent.{Sub Agent}`) is resolved to the effective agent context: [inherited/imported](../agents/inheritance-and-imports.md) **resolved source**, the raw **unresolved source**, `permanentId`, and resolved name. Results are cached per agent hash.
2. **Model requirements** — the resolved source is compiled (or loaded from [prepared cache](../agents/preparation-and-caching.md)) into [model requirements](../book-language.md#two-stage-parsing).
3. **Identity** — the current user (session) and/or team-conversation identity are resolved from the request and parameters.
4. **Credentials** — when the source declares the corresponding commitments, per-user/per-agent secrets are resolved and injected as prompt parameters: GitHub token for `USE PROJECT` ([GitHub projects](../integrations/github-projects.md)), Google access token for `USE CALENDAR` ([Calendar](../integrations/calendar.md)), SMTP credential for `USE EMAIL` ([Email](../integrations/email.md)) — each falling back to [wallet](../users/wallet.md) records.
5. **Prompt parameters** — client `parameters` are merged with server-provided context: [user memory](../users/memory.md) context, user identity, private-mode flag, attachment references, local server URL, and the [team internal token](../users-and-authentication.md#team-internal-access-token) for delegated calls.
6. **Runtime tools** — [progress + attachment tools](runtime-tools.md) are attached; commitment-granted tools come from the compiled requirements.
7. **Preparation wait** — if a [background preparation](../agents/preparation-and-caching.md) for the same agent fingerprint is currently running, the request waits for it (bounded timeout) to avoid duplicate expensive indexing.
8. **History recording** — unless [private mode](../chats.md#private-mode): the user message is recorded to [chat history](history-and-feedback.md) (source `AGENT_PAGE_CHAT`, actor `TEAM_MEMBER` for team calls) and its `messageHash` retained for chaining the reply.
9. **Team-member frozen chat** — for team conversations, a frozen durable-chat record (source `TEAM_MEMBER`) is created with a pending placeholder, then finalized with the completed reply, so delegated conversations are observable in the [user-chats UI](user-chats.md#frozen-chats).
10. **Execution** — the agent executes via the LLM provider with streaming; the provider-side agent object is cached per agent hash (cache misses emit an `assistant_preparation` tool frame). Deltas and tool calls stream per the [protocol](streaming-protocol.md).
11. **Finalization** — empty replies are replaced by fallback text; [message suffix](../chats.md#message-suffix) is appended and streamed; the reply is recorded to history (chained to the user message hash, with usage); calendar tool activity is logged; [self-learning](../agents/self-learning.md) source updates are persisted (skipped in private mode and for book-scoped agents).

## Notes

-   The server never persists the *thread* for stateless chats — only the per-turn history log (and nothing in private mode).
-   Attachments must already be uploaded (see [Attachments and files](attachments-and-files.md)); the request carries references, not bytes.
