# Chat Streaming Protocol

The wire protocol of the [stateless chat](stateless-chat.md) endpoint (`POST /agents/:agentName/api/chat`). It is a custom incremental-markdown protocol (not SSE, not OpenAI chunks — those exist separately in [OpenAI compatibility](api/openai-compatibility.md)). The consuming client is the chat UI and the SDK's `RemoteAgent`.

## Response envelope

-   Status `200`, `Content-Type: text/markdown`, `Access-Control-Allow-Origin: *`.
-   The body is an unbounded stream of UTF-8 chunks belonging to three frame kinds, distinguished by content:

### 1. Text deltas

Raw markdown fragments of the reply, in order. **Whitespace is encoded** so transports/proxies can never swallow meaningful chunks:

| Character(s) in content        | Token on the wire |
| ------------------------------ | ------------------ |
| `\r\n`, `\r`, `\n`             | `[WS:NEWLINE]`     |
| `\t`                           | `[WS:TAB]`         |
| ` ` and non-breaking space     | `[WS:SPACE]`       |

Clients MUST decode tokens back (`[WS:NEWLINE]`→`\n`, `[WS:TAB]`→`\t`, `[WS:SPACE]`→` `) before rendering. Encoding is applied to every text delta including the fallback text and the streamed [message suffix](../chats.md#message-suffix).

### 2. Keep-alive pings

The literal line `STREAM_KEEP_ALIVE` framed by newlines:

```
\nSTREAM_KEEP_ALIVE\n
```

Sent immediately when the stream opens and then every **25 s** while the reply is still being composed. Clients MUST drop these frames silently; they only prove liveness and defeat idle-connection timeouts.

### 3. Tool-call frames

Progress/result snapshots of tool usage, as one-line JSON envelopes framed by newlines:

```
\n{"toolCalls":[{"name":"…","arguments":{…},"createdAt":"…", …}]}\n
```

Rules:

-   Emitted continuously while streaming and once more with the final tool-call list; the server MUST deduplicate — an envelope identical to the previously sent one is not re-sent.
-   Tool calls are *prepared for streaming* (sanitized/truncated for transport) before serialization.
-   A synthetic tool call named `assistant_preparation` (arguments `{ phase }`) reports pre-answer preparation work (e.g. "Preparing AgentKit agent") so the UI can show progress chips before tokens arrive.
-   Clients render tool calls as activity chips/cards and MUST tolerate unknown tool names and argument shapes.

## Client parsing algorithm

Scan the stream line-wise **only** for the two framed kinds (keep-alive literal, `{"toolCalls":…}` JSON lines); everything else is concatenated as encoded markdown text. This is unambiguous because real text never contains raw newlines (they are `[WS:NEWLINE]` tokens) — any raw `\n` on the wire belongs to framing.

## Stream lifecycle

-   **Happy path:** deltas (+ tool frames) → optional fallback text if the model produced only whitespace → streamed message-suffix deltas → final tool-call frame → stream closes.
-   **Client abort:** when the request is aborted or the connection drops, the server MUST stop model execution promptly (abort signal propagation), stop writing, and clean up without recording an error.
-   **Server error mid-stream:** the stream is errored/terminated; the client shows the [failure message](../chats.md#failure-message). Errors before streaming start are returned as JSON (see [Stateless chat](stateless-chat.md#error-responses)).
-   Persistence (history recording, self-learning) happens after the full reply is composed, before the stream closes.

## Durable-chat snapshot stream

Durable [user chats](user-chats.md#snapshot-stream) use a different, simpler protocol (newline-delimited JSON snapshots of canonical chat state), specified there.
