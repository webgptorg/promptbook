# HTTP Routes

This spec inventories route families and links each family to its detailed behavior. Route handlers MUST preserve the authentication, response-shape, and side-effect behavior defined in the linked specs.

## Public Site Routes

| Route | Responsibility |
| --- | --- |
| `/` | Homepage and raw-IP bootstrap behavior. See [Server Routing](server-routing.md). |
| `/agents` | Agent organization homepage. |
| `/agents/<agentName>` | Agent profile page. |
| `/agents/<agentName>/chat` | Agent chat page. |
| `/agents/<agentName>/book` | Book editor page. |
| `/agents/<agentName>/book+chat` | Combined book and chat view. |
| `/agents/<agentName>/history` | Agent history view. |
| `/agents/<agentName>/integration` | Integration instructions and API examples. |
| `/agents/<agentName>/website-integration` | Website/embed integration view. |
| `/agents/<agentName>/iframe` | Embeddable agent view. |
| `/agents/<agentName>/images` | Agent image management view. |
| `/agents/<agentName>/timeouts` | Durable chat timeout view. |
| `/agents/<agentName>/system-message` | System-message/debug view. |
| `/agents/<agentName>/export-as-transpiled-code` | Transpiled-code export view. |
| `/docs` | Server documentation. |
| `/swagger` | Swagger UI for `/openapi.json`. |
| `/restricted` | Restricted-access landing page. |
| `/manifest.webmanifest`, `/sw.js` | PWA support. |
| `/robots.txt`, `/sitemap.xml`, `/security.txt`, `/humans.txt` | Static public metadata routes. |

Legacy `/<agentName>` requests redirect to `/agents/<agentName>` when the segment is not reserved.

## Public and Semi-Public APIs

| Route | Responsibility |
| --- | --- |
| `GET /api/agents` | Public agent organization payload. See [Agents](agents.md). |
| `GET /api/federated-agents` | Federated agent discovery. |
| `GET /api/search` | Public search. |
| `GET /api/docs/book.md` | Standalone book-language documentation. |
| `GET /api/health` | Health check. |
| `/api/page-preview/*` | Browser-backed page preview streams and input. |
| `/api/scrape` | Page scraping utility. |
| `/api/browser-test/*` | Browser automation utilities. |
| `/api/pixel-agents-assets/*`, `/s3/*` | Asset serving paths. |

Routes that can expose automation or remote browsing MUST enforce the current security policy of the implementation.

## Authentication APIs

| Route | Responsibility |
| --- | --- |
| `POST /api/auth/login` | Password login. See [Authentication](authentication.md). |
| `POST /api/auth/logout` | Clears session cookies. |
| `POST /api/auth/change-password` | Password change for database users. |
| `/api/auth/shibboleth/*` | Shibboleth login, callback, metadata, and audit flows. |
| `/api/profile` | Current user profile and profile updates. |
| `/api/api-tokens` | User-scoped API-token management for admins. |

## Agent Management APIs

| Route | Responsibility |
| --- | --- |
| `PATCH /api/agents/<agentName>` | Rename or visibility update for writable agent. |
| `DELETE /api/agents/<agentName>` | Soft-delete writable agent. |
| `POST /api/agents/<agentName>/clone` | Clone readable agent. |
| `POST /api/agents/import` | Admin agent import. |
| `/api/agent-folders` | Folder create/list helpers. |
| `/api/agent-folders/<folderId>` | Folder update/delete helpers. |
| `/api/agent-organization` | Organization tree data and ordering. |
| `/api/chat-history` | Chat-history maintenance. |
| `/api/chat-feedback` | Chat feedback management. |

Agent management behavior is defined in [Agents](agents.md).

## Agent-Scoped APIs

| Route | Responsibility |
| --- | --- |
| `/agents/<agentName>/api/book` | Read/update resolved book source. |
| `/agents/<agentName>/api/book/history` | Source history list/restore. |
| `/agents/<agentName>/api/book/reference-diagnostics` | Draft reference diagnostics. |
| `/agents/<agentName>/api/profile` | Agent profile payload. |
| `/agents/<agentName>/api/model-requirements` | Resolved model requirements. |
| `/agents/<agentName>/api/chat` | Stateless chat streaming. |
| `/agents/<agentName>/api/feedback` | Agent feedback submission. |
| `/agents/<agentName>/api/meta-disclaimer` | Disclaimer status and acceptance. |
| `/agents/<agentName>/api/user-chats` | Durable chat list/create. |
| `/agents/<agentName>/api/user-chats/<chatId>` | Durable chat read/update/delete. |
| `/agents/<agentName>/api/user-chats/<chatId>/messages` | Queue durable chat message. |
| `/agents/<agentName>/api/user-chats/<chatId>/stream` | Durable chat NDJSON stream. |
| `/agents/<agentName>/api/timeouts` | Timeout list/counters. |
| `/agents/<agentName>/api/timeouts/actions` | Bulk timeout actions. |
| `/agents/<agentName>/api/calendar/*` | Calendar connections and events. |
| `/agents/<agentName>/api/share-target` | PWA share-target consumption. |
| `/agents/<agentName>/api/mcp` | MCP surface for agent tools. |
| `/agents/<agentName>/api/voice` | Voice interaction helpers. |
| `/agents/<agentName>/api/openai/*` | Agent-scoped OpenAI-compatible APIs. |
| `/agents/<agentName>/api/openrouter/*` | Provider-compatible API aliases. |

Book behavior is defined in [Book Language and Editing](book-language-and-editing.md). Chat behavior is defined in [Chat Runtime](chat-runtime.md) and [User Chats](user-chats.md).

## OpenAI-Compatible APIs

| Route | Responsibility |
| --- | --- |
| `/api/openai/v1/chat/completions` | Global OpenAI-compatible chat completion. |
| `/api/openai/v1/models` | OpenAI-compatible model listing where supported. |
| agent-scoped provider routes | Provider-compatible aliases for a specific agent. |

See [Chat Runtime](chat-runtime.md).

## Management API

All `/api/v1/*` routes are defined in [Management API](management-api.md).

## User Data APIs

| Route | Responsibility |
| --- | --- |
| `/api/user-memory` | Memory list/create/update/delete. |
| `/api/user-wallet` | Wallet record management. |
| `/api/user-data` | Key/value user data. |
| `/api/upload` | File upload handling. |
| `/api/files/*` | File metadata and serving helpers where present. |
| `/api/images` | Image records and avatar/testing image handling. |
| `/api/push-subscriptions` | Web push subscriptions. |
| `/api/settings/*` | Theme, notifications, keybindings, and preferences. |

See [User Data](user-data.md).

## Admin APIs and Pages

Admin routes live under `/admin` and `/api/admin`. They are defined in [Admin](admin.md).

Important route families include:

- metadata
- users
- server limits and tool limits
- servers
- logs
- backups
- update
- code runners and CLI access
- task manager
- custom CSS and JavaScript

## Internal Worker APIs

Internal routes live under `/api/internal` and are protected by the worker token. They are defined in [Background Workers](operations/background-workers.md).

Important routes:

- `/api/internal/user-chat-jobs/run`
- `/api/internal/user-chat-timeouts/run`
- `/api/internal/agent-runner-limits`

