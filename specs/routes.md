# Routes

Complete inventory of the HTTP surface. Behavior is specified in the linked specs; this file only maps URLs to responsibilities. `:agentName` accepts any [agent identifier](agents.md#identity). Remember the global rewrite: `/:name…` → `/agents/:name…` for non-reserved first segments, and [custom-domain rewrites](servers-and-multi-tenancy.md#custom-domains).

## Pages (HTML)

### Public

| Path | Purpose |
| --- | --- |
| `/` | Homepage: agent directory (+ folders, federated servers). [Pages](ui/pages.md#homepage) |
| `/agents` | Same directory under the canonical path. |
| `/agents/:agentName` | Agent profile. [Pages](ui/pages.md#agent-pages) |
| `/agents/:agentName/chat` (+ `/chat/chatgpt-like`) | Chat UI (durable for signed-in users, stateless otherwise; `?headless` variant for embedding). |
| `/agents/:agentName/book` | Book editor. |
| `/agents/:agentName/book+chat` | Split editor + chat preview. |
| `/agents/:agentName/history` | Source version history. |
| `/agents/:agentName/system-message` | Compiled system-message inspector. |
| `/agents/:agentName/timeouts` | Agent-scoped timers view. [Timeouts](chat/timeouts.md) |
| `/agents/:agentName/iframe`, `/embed` | Embedding surfaces. [Embedding and PWA](ui/embedding-and-pwa.md) |
| `/agents/:agentName/integration`, `/agents/:agentName/website-integration` | Integration snippets/instructions. |
| `/agents/:agentName/export-as-transpiled-code` | Export agent as standalone code. [Transfer and backup](agents/transfer-and-backup.md#transpiled-export) |
| `/agents/:agentName/textarea` | Minimal input experiment surface. |
| `/agents/:agentName/share-target` | PWA share-target receiver. [Embedding and PWA](ui/embedding-and-pwa.md#share-target) |
| `/docs`, `/docs/:docId` | Documentation. [Pages](ui/pages.md#documentation) |
| `/search` | Search UI. [Pages](ui/pages.md#search) |
| `/restricted` | IP-restriction landing page. |
| `/swagger` | OpenAPI explorer for the [Management API](api/management-api.md). |
| `/story/*`, `/experiments/story`, `/test/og-image` | Development/experimental surfaces (not part of the compatibility contract). |

### Signed-in

| Path | Purpose |
| --- | --- |
| `/dashboard` | User dashboard. |
| `/recycle-bin` | Soft-deleted agents/folders. [Agents](agents.md#soft-deletion-and-restore) |
| `/system/profile`, `/system/settings`, `/system/user-memory`, `/system/user-wallet`, `/system/utilities`, `/system/utilities/mocked-chats[/view]` | Personal settings surfaces. [Settings](users/settings-and-notifications.md), [Memory](users/memory.md), [Wallet](users/wallet.md) |

### Admin

All under `/admin` — see [Admin](ui/admin.md) for the section list.

## Meta/static routes

`/robots.txt`, `/sitemap.xml` ([server visibility](servers-and-multi-tenancy.md#server-visibility)), `/manifest.webmanifest` (+ per-agent manifest params), `/humans.txt`, `/security.txt`, `/openapi.json` ([Management API](api/management-api.md#openapi)), `/api/embed.js` ([Embedding](ui/embedding-and-pwa.md#embed-script)), `/agents/:agentName/images/*` (avatar/screenshot renders, [Avatars](agents/avatars-and-visuals.md)), `/pixel-agents-assets/*` (bundled visual assets), `/s3/:first/:second/:hash/:filename` (stored-file proxy, [Attachments and files](chat/attachments-and-files.md#serving)).

## Agent-scoped APIs (`/agents/:agentName/api/...`)

| Route | Methods | Spec |
| --- | --- | --- |
| `chat` | POST (stream), OPTIONS | [Stateless chat](chat/stateless-chat.md) |
| `feedback` | POST | [History and feedback](chat/history-and-feedback.md#feedback) |
| `profile` | GET, OPTIONS | [Public agent API](api/public-agent-api.md#profile) |
| `book`, `book/history`, `book/missing-agent`, `book/reference-diagnostics` | GET/PUT/POST | [Public agent API](api/public-agent-api.md#book) |
| `model-requirements`, `model-requirements/system-message` | GET | [Public agent API](api/public-agent-api.md#model-requirements) |
| `meta-disclaimer` | GET/POST | [Public agent API](api/public-agent-api.md#meta-disclaimer) |
| `mcp` | ALL | [Public agent API](api/public-agent-api.md#mcp) |
| `openai/chat/completions`, `openai/v1/chat/completions`, `openai/models`, `openai/v1/models`, `openrouter/chat/completions` | POST/GET | [OpenAI compatibility](api/openai-compatibility.md) |
| `user-chats`, `user-chats/:chatId`, `…/draft`, `…/messages`, `…/stream`, `…/jobs/:jobId[/cancel]`, `…/timeouts/:timeoutId[/cancel]` | CRUD/stream | [User chats](chat/user-chats.md) |
| `timeouts`, `timeouts/:timeoutId`, `timeouts/actions` | GET/POST/PATCH | [Timeouts](chat/timeouts.md#agent-scoped-api) |
| `voice` | POST | [Voice](chat/voice.md) |
| `calendar-connections[…]`, `calendar-events` | GET/POST | [Calendar](integrations/calendar.md) |
| `share-target/:shareTargetId[/consume]` | GET/POST | [Embedding and PWA](ui/embedding-and-pwa.md#share-target) |
| `export-as-transpiled-code/api[/download]` | GET | [Transfer and backup](agents/transfer-and-backup.md#transpiled-export) |

## Server-scoped APIs (`/api/...`)

| Route family | Spec |
| --- | --- |
| `auth/login`, `auth/logout`, `auth/change-password`, `auth/shibboleth/*`, `profile` | [Users and authentication](users-and-authentication.md) |
| `users`, `users/:username`, `api-tokens`, `admin-email` | [Users and authentication](users-and-authentication.md#user-management) |
| `agents`, `agents/:agentName`, `agents/:agentName/clone|restore`, `agents/import|export` | [Agents](agents.md), [Transfer and backup](agents/transfer-and-backup.md) |
| `agent-folders[…]`, `agent-organization` | [Folders and organization](agents/folders-and-organization.md) |
| `federated-agents` | [Federation](agents/federation.md) |
| `v1/*` | [Management API](api/management-api.md) |
| `openai/v1/chat/completions`, `openai/v1/models`, `openai/v1/audio/transcriptions` | [OpenAI compatibility](api/openai-compatibility.md) |
| `internal/user-chat-jobs/run`, `internal/user-chat-timeouts/run`, `internal/agent-runner-limits` | [Internal workers API](api/internal-workers.md) |
| `upload`, `images/:filename`, `browser-artifacts/:artifactName` | [Attachments and files](chat/attachments-and-files.md) |
| `chat`, `chat-streaming` (dev-only smoke tests), `chat/citation-label`, `chat/export/pdf`, `system/mocked-chats` | [Chats](chats.md) |
| `chat-history[…]`, `chat-feedback[…]` (+ `/export`) | [History and feedback](chat/history-and-feedback.md) |
| `user-memory[…]` | [Memory](users/memory.md) |
| `user-wallet[…]` | [Wallet](users/wallet.md) |
| `settings/keybindings|notifications|theme`, `push-subscriptions` | [Settings and notifications](users/settings-and-notifications.md) |
| `spawn-agent` | [Runtime tools](chat/runtime-tools.md#spawn_agent) |
| `search`, `scrape`, `page-preview/*` | [Runtime tools](chat/runtime-tools.md), [Pages](ui/pages.md#search) |
| `send-email`, `emails/incoming/sendgrid`, `messages` | [Email](integrations/email.md) |
| `elevenlabs/tts` | [Voice](chat/voice.md) |
| `calendar-oauth/*` | [Calendar](integrations/calendar.md) |
| `github-app/*` | [GitHub projects](integrations/github-projects.md) |
| `team-agent-profile` | [Public agent API](api/public-agent-api.md#team-agent-profile) |
| `metadata[/export|/import]`, `custom-css`, `custom-js` | [Configuration](configuration.md) |
| `usage`, `error-reports/application`, `story/export`, `long-running-task` | [Admin](ui/admin.md), observability helpers |
| `docs/book.md`, `docs/book-language.md` | [Book language](book-language.md#documentation-endpoint) |
| `health` | Liveness/readiness probe; MUST NOT require DB access. |
| `admin/*` | [Admin](ui/admin.md#admin-apis) |

## CORS conventions

-   Agent-scoped public APIs (chat, profile, OpenAI-compat) answer `OPTIONS` and set `Access-Control-Allow-Origin: *` (chat additionally allows the team-token header) so agents are embeddable anywhere.
-   The [Management API](api/management-api.md#cors) uses the configurable `MANAGEMENT_API_CORS_ORIGINS`.
-   The root-path agent redirect carries permissive CORS headers.
