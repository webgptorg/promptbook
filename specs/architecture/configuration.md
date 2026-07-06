# Configuration

The server is configured at three levels: **environment variables** (deploy-time secrets/wiring),
the **`Metadata`** table (runtime, admin-editable, per logical server), and the **`ServerLimit`** table
(numeric guardrails). Where a setting exists in more than one place, `Metadata`/`ServerLimit` win for
runtime behavior and env vars provide secrets/bootstrap.

## `Metadata` — runtime settings

A per-server key/value table (`key` unique, `value` text, optional `note`). Admins edit it in the
[metadata admin page](../features/admin.md); it is a runtime configuration store. Each supported key has a
**definition** (default value, human note, editor `type`, optional `options` list, optional `legacyKeys`).
Editor types: `TEXT_SINGLE_LINE`, `TEXT`, `NUMBER`, `BOOLEAN`, `IMAGE_URL`, `IP_RANGE`. Values constrained
to an `options` list are validated on write.

Reads fall back to the built-in default when the row is absent, then to `legacyKeys` when the canonical key
is missing.

### Supported keys (grouped)

**Identity & branding**
- `SERVER_NAME` — name shown in the heading bar. Default `Promptbook Agents Server`.
- `SERVER_DESCRIPTION` — description for search-engine results.
- `SERVER_LOGO_URL`, `SERVER_FAVICON_URL` — image URLs.
- `HOMEPAGE_MESSAGE` — markdown above the agents list on the homepage.
- `AGENT_NAMING` — override singular/plural agent noun, `singular/plural` (e.g. `chatbot/chatbots`).
- `FOOTER_LINKS` (JSON array of `{title,url}`), `IS_FOOTER_SHOWN`.

**Language & locale**
- `SERVER_LANGUAGE` — default UI language (options from the language registry).
- `IS_SERVER_LANGUAGE_ENFORCED` — when true, users cannot override the language.

**Visibility & indexing**
- `SERVER_VISIBILITY` — `PRIVATE` (blocks sitemap/indexing) or `PUBLIC` (indexes PUBLIC agents). See
  [Security & access](./security-and-access.md).
- `DEFAULT_VISIBILITY` — default visibility for new agents (`PRIVATE`/`UNLISTED`/`PUBLIC`; ships `UNLISTED`).
- `IS_EMBEDDING_ALLOWED` — allow the headless/iframe chat route for third-party embeds.
- `RESTRICT_IP` — comma-separated allowed IPs/CIDRs; empty = no restriction.

**Authentication (Shibboleth SSO)** — see [Security & access](./security-and-access.md)
- `IS_SHIBBOLETH_AUTH_ACTIVE`, `SHIBBOLETH_IDP_METADATA_URL`, `SHIBBOLETH_IDP_METADATA_XML`,
  `SHIBBOLETH_SP_ENTITY_ID`, `SHIBBOLETH_EMAIL_ATTRIBUTE_NAMES`, `SHIBBOLETH_DISPLAY_NAME_ATTRIBUTE_NAMES`,
  `SHIBBOLETH_UNSTRUCTURED_NAME_ATTRIBUTE_NAMES`.
- `ADMIN_EMAIL` — address for password-reset / registration requests.

**Chat behavior & UI**
- `THINKING_MESSAGES` — slash-delimited "thinking…" placeholder variants.
- `CHAT_FAIL_MESSAGE` — friendly text when a reply fails.
- `CHAT_FEEDBACK_MODE` (+ legacy `IS_FEEDBACK_ENABLED`) — post-response feedback UI mode.
- `CHAT_VISUAL_MODE` — default bubble/article rendering for new sessions.
- `DEFAULT_THEME` — `SYSTEM`/`LIGHT`/`DARK` for browsers without a preference.
- `IS_FILE_ATTACHEMENTS_ENABLED` — file attachments in chat.
- `DEFAULT_AGENT_AVATAR_VISUAL` — built-in avatar for agents without `META IMAGE`/`META AVATAR`.
- `DEFAULT_IS_SOUNDS_ON`, `DEFAULT_IS_VIBRATION_ON`, `DEFAULT_IS_NOTIFICATIONS_ON` — default per-user
  toggles.
- `IS_CONTROL_PANEL_*_ENABLED` — show/hide control-panel sections (Sound, Vibration, Notifications,
  Self-learning, Private mode, Language, Chat visual mode).

**Voice** — see [Voice](../features/voice.md)
- `IS_EXPERIMENTAL_VOICE_CALLING_ENABLED`, `IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED`.

**New-agent flow**
- `NEW_AGENT_WIZARD` — `BOILERPLATE` / `WIZARD` / `MANGO_WIZARD` (ships `MANGO_WIZARD`).
- `NAME_POOL` — language used to generate new agent names.

**Federation** — see [Federation](../features/federation.md)
- `FEDERATED_SERVERS` — comma-separated federated server URLs.
- `SHOW_FEDERATED_SERVERS_PUBLICLY`, `FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS` (deprecated → limits).

**Integrations**
- GitHub App: `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_STATE_SECRET`.
- Google Calendar: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`,
  `GOOGLE_CALENDAR_REDIRECT_URI`, `GOOGLE_CALENDAR_STATE_SECRET`.
- `MANAGEMENT_API_CORS_ORIGINS` — allowed origins for the [management API](../api/management-api-v1.md)
  and OpenAPI fetches (`*` or comma-separated).

**Operational**
- `USER_CHAT_BACKGROUND_CRON_INTERVAL_MINUTES` — expected cadence of the background chat workers.
- `TOOL_USAGE_LIMITS`, `MAX_FILE_UPLOAD_SIZE_MB` — deprecated mirrors of [server limits](#serverlimit).
- Analytics keys (a set contributed by the analytics config) — see [Usage & analytics](../features/admin.md).

Miscellaneous flags also exist (`IS_EXPERIMENTAL_PWA_APP_ENABLED`, …). The definition list is the
authoritative source; unknown keys are still storable but unvalidated.

## `ServerLimit` — numeric guardrails

A dedicated table (`key` unique, `value` bigint) for tunable limits, edited on the
[limits admin page](../features/admin.md). Each has a definition (category, title, unit `count`/`MB`/`ms`,
default, minimum, step) and, for backward compatibility, may mirror a deprecated `Metadata` key.

| Key | Category | Default | Meaning |
|---|---|---|---|
| `TIMEOUT_MAX_ACTIVE_PER_CHAT` | Timeout tools | 5 | Max concurrent timers per chat. |
| `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT` | Timeout tools | 10 | Max timer firings per chat per UTC day. |
| `MAX_FILE_UPLOAD_SIZE_MB` | Files | 50 | Max upload size (chat + share-target). |
| `FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS` | Federation | (default) | Retry delay for federated book imports. |
| `SPAWN_AGENT_MAX_DEPTH` | Agent spawning | 2 | Max nested `spawn_agent` hops per runtime context. |
| `SPAWN_AGENT_RATE_LIMIT_MAX` | Agent spawning | 5 | Max spawned agents per actor per window. |
| `SPAWN_AGENT_RATE_LIMIT_WINDOW_MS` | Agent spawning | 600000 | Spawn rate-limit window. |
| `LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS` | Local runner | 3 | Max retries of one queued message before failing it. |
| `LOCAL_AGENT_RUNNER_MAX_PARALLEL_MESSAGES` | Local runner | 3 | Max concurrent harness answers. |

## Environment variables (deploy-time)

Secrets and wiring that must not live in the database. Key ones:

- **Database**: `PTBK_AGENTS_SERVER_DATABASE`, `PTBK_AGENTS_SERVER_SQLITE_PATH`, `POSTGRES_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_AUTO_MIGRATE`, `SUPABASE_TABLE_PREFIX`.
- **Auth/secrets**: `ADMIN_PASSWORD`, `SESSION_SECRET` (required in production; HMAC key for session
  cookies), `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN` (same-server team calls; fails closed if unset).
- **Workers**: `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN` (authorizes `/api/internal/*`; required in
  production). See [Chat execution](../chat/execution-model.md).
- **LLM keys**: `OPENAI_API_KEY` (and other provider keys) — see [Engine boundary](./promptbook-engine.md).
- **Agent runners**: `PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN`, `PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER`,
  `PROMPTBOOK_AGENT_RUNNER_GITHUB_VISIBILITY` (external runner); `PTBK_AGENTS_SERVER_AGENT_ROOT` (local
  runner). See [Runners](../chat/runners.md).
- **Email inbound**: `SENDGRID_INBOUND_PARSE_PUBLIC_KEY` / `SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET` /
  `SENDGRID_INBOUND_PARSE_HOSTS`. See [Email](../features/email-messaging.md).
- **Browser**: `REMOTE_BROWSER_URL` (remote Playwright server). See [Tools](../features/tools-and-capabilities.md).
- **Routing/self-host**: `SERVERS`, `NEXT_PUBLIC_SITE_URL`, `PTBK_PUBLIC_IP_ADDRESS`, and the
  `NEXT_PUBLIC_VERCEL_*` deployment-metadata variables.

Secrets must be **dedicated** (not reused) — e.g. `SESSION_SECRET` must differ from `ADMIN_PASSWORD` so a
leak of one cannot forge the other; the worker token must not fall back to `ADMIN_PASSWORD`/service key.

## Related specs

- [Multi-server model](./multi-server.md) · [Security & access](./security-and-access.md)
- [Admin](../features/admin.md) · [Configuration data model](../data-model/misc.md)
