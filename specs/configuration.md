# Configuration

Configuration has three layers, from least to most dynamic:

1. **Environment variables** — deployment-scoped, set by the operator, never editable at runtime.
2. **`Metadata` table** — instance-scoped key/value strings, editable by admins at `/admin/metadata` (`GET/PUT /api/metadata`). Every key below has a built-in default used when the row is absent; unknown keys are allowed. Keys with an enumerated option set MUST be validated on write. Some keys have `legacyKeys` read as fallback.
3. **`ServerLimit` table** — instance-scoped numeric limits, editable at `/admin/limits` (`/api/admin/limits`), with deprecated metadata keys mirrored for backward compatibility.

## Environment variables

### Required core

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL of the deployment (overridden per request by the resolved server domain). |
| `OPENAI_API_KEY` | LLM provider key used for agent execution, embeddings, transcription. |
| `POSTGRES_URL` (or `DATABASE_URL`) | SQL connection string (migrations + SQL access). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public database API endpoint/key (browser reads). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged database key. |
| `SESSION_SECRET` | HMAC key for session cookies. **Required in production**; no fallback allowed ([Users and authentication](users-and-authentication.md#sessions)). |
| `ADMIN_PASSWORD` | Password of the built-in `admin` environment super-admin. |

### Multi-tenancy and database mode

| Variable | Meaning |
| --- | --- |
| `SUPABASE_TABLE_PREFIX` | Fallback/default table prefix (before/without `_Server` rows). |
| `SERVERS` | Comma-separated domains forming a virtual server registry ([Servers and multi-tenancy](servers-and-multi-tenancy.md#server-registry)). |
| `SUPABASE_AUTO_MIGRATE` | `true` → run migrations automatically at startup. |
| `PTBK_AGENTS_SERVER_DATABASE` | `supabase` or `sqlite` (local standalone DB). |
| `PTBK_AGENTS_SERVER_SQLITE_PATH` | SQLite file path (default `.promptbook/agents-server.sqlite`). |
| `PTBK_AGENTS_SERVER_ENV_FILE` | Explicit `.env` file to load in CLI mode. |

### Security tokens

| Variable | Meaning |
| --- | --- |
| `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN` | Shared token for `/api/internal/*` worker routes. Required in production (no fallback); CLI launcher generates a per-process value ([Internal workers API](api/internal-workers.md)). |
| `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN` | Dedicated secret for same-server `TEAM` access to private agents; unset ⇒ feature disabled (fails closed). |

### Storage and integrations (all optional)

| Variable | Meaning |
| --- | --- |
| `CDN_PROVIDER`, `CDN_ENDPOINT`, `CDN_BUCKET`, `CDN_ACCESS_KEY_ID`, `CDN_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_CDN_PUBLIC_URL`, `NEXT_PUBLIC_CDN_PATH_PREFIX`, `PTBK_FILE_STORAGE_MODE`, `VERCEL_BLOB_READ_WRITE_TOKEN` | Object-storage/CDN selection ([Attachments and files](chat/attachments-and-files.md#storage)). |
| `SENDGRID_API_KEY`, `ZEPTOMAIL_API_KEY`, SMTP wallet records | Outgoing email providers ([Email](integrations/email.md)). |
| `SENDGRID_INBOUND_PARSE_PUBLIC_KEY`, `SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET`, `SENDGRID_INBOUND_PARSE_HOSTS` | Inbound email webhook verification ([Email](integrations/email.md#incoming-email)). |
| `ELEVENLABS_API_KEY` | Text-to-speech ([Voice](chat/voice.md)). |
| `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` | VAPID web-push keys ([Settings and notifications](users/settings-and-notifications.md#push-notifications)). |
| `VIRUSTOTAL_API_KEY` | Optional upload scanning ([Attachments and files](chat/attachments-and-files.md#security-checking)). |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_CLAUDE_API_KEY` | Secondary LLM provider keys (where supported). |
| `REMOTE_BROWSER_URL` | WebSocket endpoint of a remote Playwright browser server; empty ⇒ local browser ([Runtime tools](chat/runtime-tools.md#run_browser)). |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT` | Error reporting. |

### Deployment/runtime (reference implementation)

`NODE_ENV`, `PORT`, Vercel-injected `VERCEL_*`/`NEXT_PUBLIC_VERCEL_*` build metadata, `NEXT_PUBLIC_SERVER_NAME`, `SERVER_VISIBILITY` (env fallback for the metadata key), `RESTRICT_IP` (env fallback), `PTBK_PUBLIC_IP_ADDRESS`, `PTBK_INSTALL_DIR`, `PTBK_PM2_APP_NAME`, `PTBK_SKIP_PM2_RESTART`, `PTBK_VPS_INSTALL_SCRIPT`, `PROMPTBOOK_REPOSITORY_URL`/`_REF` (self-update), `PTBK_AGENTS_SERVER_AGENT_ROOT` (local runner folder, [User chats](chat/user-chats.md#agent-runner)), `PTBK_HARNESS`/`PTBK_MODEL`/`PTBK_THINKING_LEVEL`/`PTBK_AGENT` (CLI coder harness defaults), `NEXT_PUBLIC_APPLICATION_ERROR_VARIANT` (error-page flavor). See [Deployment](operations/deployment.md).

## Metadata

Admin-editable instance settings. Types: single-line text, multiline text, boolean (`'true'`/`'false'` strings), number (as string), image URL, IP range. Complete key set with defaults:

### Branding and language

| Key | Default | Meaning |
| --- | --- | --- |
| `SERVER_NAME` | `Promptbook Agents Server` | Name in the heading bar. |
| `SERVER_DESCRIPTION` | `Agents server powered by Promptbook` | SEO description. |
| `SERVER_LOGO_URL`, `SERVER_FAVICON_URL` | *(empty)* | Branding images. |
| `SERVER_LANGUAGE` | `en` | Default UI language (option set from the language registry). |
| `IS_SERVER_LANGUAGE_ENFORCED` | `false` | Forbid per-user language override. |
| `AGENT_NAMING` | `Agent / Agents` | Singular/plural word used for "agent" in the UI. |
| `HOMEPAGE_MESSAGE` | *(empty)* | Markdown above the homepage agent list. |
| `IS_FOOTER_SHOWN` | `true` | Footer visibility. |
| `FOOTER_LINKS` | `[]` | JSON array `{title, url}` of extra footer links. |
| `DEFAULT_THEME` | system default | `LIGHT`/`DARK`/`SYSTEM` default theme. |

### Visibility and access

| Key | Default | Meaning |
| --- | --- | --- |
| `SERVER_VISIBILITY` | `PRIVATE` | `PUBLIC`/`PRIVATE` crawl mode ([Servers and multi-tenancy](servers-and-multi-tenancy.md#server-visibility)). |
| `RESTRICT_IP` | *(empty)* | Allowed IPs/CIDRs ([restricted access](users-and-authentication.md#restricted-access)). |
| `IS_EMBEDDING_ALLOWED` | `true` | Allow embedding/headless chat ([Embedding and PWA](ui/embedding-and-pwa.md)). |
| `DEFAULT_VISIBILITY` (legacy `DEFAULT_AGENT_VISIBILITY`) | `UNLISTED` | Default visibility of new agents. |
| `ADMIN_EMAIL` | `support@ptbk.io` | Address for registration/password-reset requests. |

### Chat behavior

| Key | Default | Meaning |
| --- | --- | --- |
| `CHAT_FAIL_MESSAGE` | "Sorry, I encountered an error…" | Friendly failure text. |
| `THINKING_MESSAGES` | built-in list | Slash-delimited thinking placeholders. |
| `CHAT_VISUAL_MODE` | `BUBBLE_MODE` | Default chat rendering (`BUBBLE_MODE`/`ARTICLE_MODE`). |
| `CHAT_FEEDBACK_MODE` | `stars` | Post-response feedback UI mode. |
| `IS_FEEDBACK_ENABLED` | `true` | Legacy feedback toggle. |
| `IS_FILE_ATTACHEMENTS_ENABLED` | `true` | Chat attachments toggle. |
| `IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED` | `true` | TTS/STT endpoints and UI. |
| `IS_EXPERIMENTAL_VOICE_CALLING_ENABLED` | `false` | Voice calling (403 when disabled). |
| `USER_CHAT_BACKGROUND_CRON_INTERVAL_MINUTES` | `2` | Expected worker cron cadence ([Background workers](operations/background-workers.md)). |

### Control panel and defaults

`IS_CONTROL_PANEL_SOUND_ENABLED`, `IS_CONTROL_PANEL_VIBRATION_ENABLED`, `IS_CONTROL_PANEL_NOTIFICATIONS_ENABLED`, `IS_CONTROL_PANEL_SELF_LEARNING_ENABLED`, `IS_CONTROL_PANEL_PRIVATE_MODE_ENABLED`, `IS_CONTROL_PANEL_LANGUAGE_ENABLED`, `IS_CONTROL_PANEL_CHAT_VISUAL_MODE_ENABLED` (all `true`) — show/hide control-panel sections. `DEFAULT_IS_SOUNDS_ON` (`false`), `DEFAULT_IS_VIBRATION_ON` (`true`), `DEFAULT_IS_NOTIFICATIONS_ON` (`false`) — preference defaults. `IS_EXPERIMENTAL_PWA_APP_ENABLED` (`true`) — install-app menu option.

### Agents

| Key | Default | Meaning |
| --- | --- | --- |
| `NAME_POOL` | `ENGLISH` | Name pool for generated agent names (`ENGLISH`/`CZECH`). |
| `NEW_AGENT_WIZARD` | mode default | New-agent flow selector (plain editor vs. wizard; has a legacy key). |
| `DEFAULT_AGENT_AVATAR_VISUAL` | built-in visual id | Fallback avatar visual ([Avatars](agents/avatars-and-visuals.md)). |

### Federation

`FEDERATED_SERVERS` (comma-separated URLs), `SHOW_FEDERATED_SERVERS_PUBLICLY` (`false`), `FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS` (deprecated → limits). See [Federation](agents/federation.md).

### Integrations

`MANAGEMENT_API_CORS_ORIGINS` (`*`) — [Management API](api/management-api.md#cors) origins. GitHub App: `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_STATE_SECRET`. Google Calendar: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`, `GOOGLE_CALENDAR_STATE_SECRET`. Shibboleth: `IS_SHIBBOLETH_AUTH_ACTIVE` (`false`), `SHIBBOLETH_IDP_METADATA_URL`, `SHIBBOLETH_IDP_METADATA_XML`, `SHIBBOLETH_SP_ENTITY_ID`, and attribute-name lists for email/display-name/unstructured-name. Analytics: Google (`measurement id`, auto-pageview, anonymize-IP, ad-personalization) and Smartsupp (workspace id, auto-pageview, capture-errors) keys.

### Deprecated mirrors

`TOOL_USAGE_LIMITS`, `MAX_FILE_UPLOAD_SIZE_MB`, `FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS` — kept in sync with [server limits](#server-limits) for older versions.

Metadata can be exported/imported as a whole (`/api/metadata/export`, `/api/metadata/import`) for [backup](agents/transfer-and-backup.md#server-backup).

## Server limits

Numeric rows in `prefix_ServerLimit`; defaults apply when absent:

| Key | Default | Unit | Meaning |
| --- | --- | --- | --- |
| `TIMEOUT_MAX_ACTIVE_PER_CHAT` | (built-in) | count | Max simultaneously active timers per chat ([Timeouts](chat/timeouts.md#limits)). |
| `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT` | (built-in) | count | Max timer firings per chat per UTC day. |
| `MAX_FILE_UPLOAD_SIZE_MB` | `50` | MB | Upload size cap (chat uploads and share-target imports). |
| `FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS` | (built-in) | ms | Wait between federated import retries. |
| `SPAWN_AGENT_MAX_DEPTH` | `2` | count | Max nested `spawn_agent` hops per tool-runtime context. |
| `SPAWN_AGENT_RATE_LIMIT_MAX` | `5` | count | Max spawned agents per actor per window. |
| `SPAWN_AGENT_RATE_LIMIT_WINDOW_MS` | `600000` | ms | Spawn rate-limit window. |
| `LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS` | `3` | count | Retries before a queued runner message is moved to failed. |
| `LOCAL_AGENT_RUNNER_MAX_PARALLEL_MESSAGES` | `3` | count | Max parallel harness answers. |

## Custom CSS and JavaScript

Admins can attach custom CSS (`prefix_CustomStylesheet`) and custom JavaScript (`prefix_CustomJavascript`) per **scope** (unique). The active custom code is served to browsers via `GET /api/custom-css` and `GET /api/custom-js`; custom JS executes only with the per-request [CSP nonce](architecture.md#request-lifecycle). Managed at `/admin/custom-css` and `/admin/custom-js`.
