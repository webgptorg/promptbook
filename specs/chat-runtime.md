# Chat Runtime

Chat runtime converts a user request into prompt context, executes an agent, streams output, persists allowed history, and records feedback or tool activity.

## Chat Modes

Agents Server supports:

- Stateless web chat at `/agents/<agentName>/api/chat`.
- OpenAI-compatible chat completions through global and agent-scoped routes.
- Durable user chats and queued jobs. See [User Chats](user-chats.md).
- Same-server team calls between agents.

This spec covers stateless and OpenAI-compatible execution.

## Access Control

Before chat execution, the server MUST:

1. Resolve the target agent by name, permanent id, custom domain, or book-scoped reference.
2. Reject deleted agents with `410` and code `agent_deleted`.
3. Enforce visibility and private-agent access.
4. Allow same-server team internal access only when the dedicated team token is valid.
5. Enforce any required `META DISCLAIMER` acceptance for the current user.
6. Resolve private mode from cookie.

Private agent access failures return `403`.

## Stateless Chat Request

`POST /agents/<agentName>/api/chat` accepts JSON with:

- `message`
- `thread`
- `attachments`
- `parameters`

Rules:

- Body MUST be an object.
- Missing, null, or blank `message` defaults to `Tell me more about yourself.`
- `message` MUST be a string.
- `message` length MUST NOT exceed 20,000 characters.
- Too-long messages return `413`.
- Attachments MUST be normalized before runtime.

The route supports `OPTIONS` with CORS for `GET, POST, OPTIONS`, `Content-Type`, and `X-Promptbook-Team-Agent-Access-Token`.

## Runtime Context

For each chat run, the server builds a runtime context containing:

- Resolved agent source and model requirements.
- Agent profile and promptbook engine version.
- User identity if available.
- Private-mode state.
- Memory context. See [User Data](user-data.md).
- Wallet and project credentials when required by tools.
- Attachment context.
- Calendar, email, browser, search, file, and progress tools enabled by source and configuration.
- Local server URL.
- Team internal access token for same-server teammate calls.
- Teacher agent reference.
- Message suffix metadata when configured.

Secrets MUST only be passed to the runtime paths that need them and MUST NOT be streamed to the user.

## Streaming Response

Stateless chat streaming responds with:

```http
Content-Type: text/markdown
Access-Control-Allow-Origin: *
```

The stream MUST:

- Start promptly and keep the connection alive.
- Emit markdown text deltas, not repeated cumulative content.
- Emit tool-call updates as newline-delimited JSON frames:

```json
{"toolCalls":[]}
```

- Avoid duplicate tool-call frames for unchanged tool-call snapshots.
- Append configured message suffix text as streamed output when needed.
- Treat client aborts as cancellation.

The model provider may produce cumulative chunks internally; the server-facing stream MUST expose only the newly added text.

## Persistence

When private mode is disabled, stateless chat SHOULD persist:

- User message record in `ChatHistory`.
- Assistant response in `ChatHistory`.
- Usage data where available.
- Actor type, API key, user id, telemetry, and source.
- Frozen durable team chat messages when the request is a team conversation.

When private mode is enabled, persistent chat history and self-learning MUST be skipped.

## Self-Learning

If enabled and allowed by private-mode and agent-scope rules, the server MAY update append-only learned source from chat interactions. Self-learning MUST NOT run for book-scoped agents or private-mode chats.

## Feedback

Chat feedback is stored in `ChatFeedback`. Feedback routes MUST capture:

- Target agent identity.
- Rating or feedback mode payload.
- User note and expected answer when supplied.
- Telemetry when available.

Feedback availability is governed by `IS_FEEDBACK_ENABLED` and `CHAT_FEEDBACK_MODE`.

## OpenAI-Compatible API

OpenAI-compatible chat routes MUST:

- Accept OpenAI chat-completion-shaped requests.
- Authorize through a valid API token or allowed session path, depending on route.
- Resolve the target agent from the route or request model.
- Support streaming and non-streaming responses.
- Record `ChatHistory` with source `OPENAI_API_COMPATIBILITY`.
- Return response shapes compatible with OpenAI chat completions.

Global OpenAI-compatible routes live under `/api/openai/v1`. Agent-scoped variants live under `/agents/<agentName>/api/openai` or compatible provider-specific route families.

## Error Behavior

Errors SHOULD be returned as markdown or JSON according to route expectations. Public chat streaming routes SHOULD avoid leaking stack traces, raw provider payloads, secrets, or internal diagnostics.

