# Runtime Tools

Tools are LLM-callable functions available to an agent during a turn. They come from two sources: **commitment-granted tools** (declared with `USE …`/`TEAM`/`ACTION` in the [book](../book-language.md#commitment-registry), materialized in the compiled model requirements) and **server-attached tools** (always present in server chat executions). Tool activity streams to clients as [tool-call frames](streaming-protocol.md#3-tool-call-frames); enforcement limits come from [server limits](../configuration.md#server-limits).

## Server-attached tools (every execution)

| Tool | Purpose |
| --- | --- |
| `agent_progress` | Structured progress card shown in the chat while the agent works. Actions: `initialize`, `update`, `append_items`, `finalize`; bullet items have `pending`/`completed` status; text fields capped at 1200 chars. |
| `read_attached_file`, `search_attached_file` | Work with the turn's [attachments](attachments-and-files.md#chat-integration). |

## Commitment-granted tools

| Commitment | Tool(s) | Behavior |
| --- | --- | --- |
| `USE CALENDAR` | `calendar_list_events`, `calendar_get_event`, `calendar_create_event`, `calendar_update_event`, `calendar_delete_event`, `calendar_invite_guests` | Operate on the user's connected calendar ([Calendar](../integrations/calendar.md)); every call is audited in `prefix_CalendarActivity`. |
| `USE POPUP` | `open_popup` | Ask the human a blocking question through a modal (also how the `{User}` [pseudo-agent](../agents/inheritance-and-imports.md#pseudo-agents) teammate is realized). |
| `TEAM` | one tool per teammate (name derived from teammate URL + label) | Delegate a question to another agent: arguments `{ message, context? }`; the call runs a chat turn against the teammate (same-server private teammates authorize with the [team internal token](../users-and-authentication.md#team-internal-access-token); remote teammates via public API). Tool description embeds the teammate's name and persona. Delegated conversations are recorded as [frozen chats](user-chats.md#frozen-chats). |
| `USE MCP` | tools advertised by the connected MCP server(s) | External Model-Context-Protocol servers plugged in as tool providers. |
| `USE USER LOCATION` / `USE PRIVACY` | *(no tools)* | Inject context/constraints into the system message; user location arrives from the client as the `promptbookUserLocation` prompt parameter (`{ latitude, longitude, permission, … }`). |
| `USE IMAGE GENERATOR` | image-generation tool | Generate images through the configured provider (stored like other [generated images](attachments-and-files.md#serving)). |
| `USE PROJECT` | repository tools | GitHub repository access ([GitHub projects](../integrations/github-projects.md)). |
| `KNOWLEDGE` | provider-side retrieval | Not a callable tool: knowledge retrieval runs against the [indexed vector store](../agents/preparation-and-caching.md#knowledge-indexing); replies may carry source citations (prettified via the [citation-label endpoint](history-and-feedback.md#related-chat-utilities)). |

## `spawn_agent`

`spawn_agent` is a server-side capability exposed over HTTP (it is not granted by any commitment). It creates a persistent agent exactly like manual [creation](../agents.md#creation) (default visibility rules apply; optional folder/sort/visibility args):

-   **Authorization** — the acting user MUST be an admin; otherwise the call returns a structured `NotAllowed` error.
-   **Depth limit** — nested spawning is capped by `SPAWN_AGENT_MAX_DEPTH` (runtime context tracks the hop count).
-   **Rate limit** — per actor, `SPAWN_AGENT_RATE_LIMIT_MAX` spawns per `SPAWN_AGENT_RATE_LIMIT_WINDOW_MS` window.
-   Result: `{ status: 'created', agentId, agent }` or `{ status: 'error', error: { code, message } }`.
-   `POST /api/spawn-agent` exposes it with error-code → HTTP-status mapping.

## HTTP twins

Several server capabilities are exposed over public HTTP endpoints used by browser-side execution and diagnostics: `GET /api/search?query=…` (web search), `GET /api/scrape?url=…` (URL → markdown), `POST /api/spawn-agent`, `POST /api/send-email` (admin). Admin test surfaces: `/admin/browser-test`, `/admin/search-engine-test`, `/admin/image-generator-test`.

## Runtime context and limits

Tool implementations receive a hidden runtime context (current user, agent, chat scope, spawn depth, team-token, private-mode flag) injected server-side into tool args and stripped before the model sees results. Tool usage limits are admin-editable at `/admin/tool-limits` and read through the [server limits](../configuration.md#server-limits) layer.
