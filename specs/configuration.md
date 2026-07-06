# Configuration

Agents Server is configured through environment variables, per-server metadata, and dedicated server limits.

## Configuration Sources

Configuration precedence depends on the setting:

- Environment variables define deployment-level secrets, database mode, bootstrap values, and some hard overrides.
- `Metadata` rows define administrator-editable server behavior.
- `ServerLimit` rows define numeric operational limits.
- Built-in defaults are used when neither environment nor database values are set.

Runtime code MUST treat secrets as environment-only. Secrets MUST NOT be stored in metadata unless a dedicated integration explicitly uses a token reference or administrator-provided credential.

## Required Deployment Variables

Common deployment variables:

- `PTBK_AGENTS_SERVER_DATABASE`: `supabase`, `sqlite`, or `local`.
- `PTBK_AGENTS_SERVER_SQLITE_PATH`: SQLite database path when using local SQLite.
- `POSTGRES_URL` or `DATABASE_URL`: PostgreSQL connection for migrations and Supabase-backed deployments.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key.
- `SUPABASE_AUTO_MIGRATE`: enables or disables automatic migrations.
- `SUPABASE_TABLE_PREFIX`: explicit table prefix fallback.
- `SERVERS`: optional registered-server bootstrap data.
- `NEXT_PUBLIC_SITE_URL`: canonical public URL fallback.

AI and runtime variables:

- `OPENAI_API_KEY`
- `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN`
- `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN`

Authentication variables:

- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Inbound email variables:

- `SENDGRID_INBOUND_PARSE_PUBLIC_KEY`
- `SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET`
- `SENDGRID_INBOUND_PARSE_HOSTS`

Integration-specific variables MAY be added by the integration specs.

## Metadata

`Metadata` stores administrator-editable string values by key. Metadata values MUST be validated by their declared parser before they affect runtime behavior.

Important metadata keys include:

- `SERVER_NAME`
- `SERVER_LANGUAGE`
- `IS_SERVER_LANGUAGE_ENFORCED`
- `SERVER_DESCRIPTION`
- `SERVER_VISIBILITY`
- `SERVER_LOGO_URL`
- `SERVER_FAVICON_URL`
- `HOMEPAGE_MESSAGE`
- `CHAT_FAIL_MESSAGE`
- `RESTRICT_IP`
- `AGENT_NAMING`
- `FEDERATED_SERVERS`
- `SHOW_FEDERATED_SERVERS_PUBLICLY`
- `IS_EMBEDDING_ALLOWED`
- `IS_FEEDBACK_ENABLED`
- `CHAT_FEEDBACK_MODE`
- `IS_FILE_ATTACHEMENTS_ENABLED`
- `DEFAULT_VISIBILITY`
- `DEFAULT_AGENT_AVATAR_VISUAL`
- `NEW_AGENT_WIZARD`
- `MANAGEMENT_API_CORS_ORIGINS`
- `ADMIN_EMAIL`
- `DEFAULT_THEME`
- `CHAT_VISUAL_MODE`
- `FOOTER_LINKS`
- `IS_FOOTER_SHOWN`

Feature preferences and client defaults include sound, vibration, notifications, private-mode availability, self-learning availability, language controls, chat visual mode, and PWA behavior.

Shibboleth metadata includes:

- `IS_SHIBBOLETH_AUTH_ACTIVE`
- identity-provider metadata URL or XML
- service-provider entity id
- accepted attribute names

Calendar, GitHub, analytics, voice, and other integrations define additional metadata keys. See [Integrations](integrations.md).

## Server Visibility

`SERVER_VISIBILITY` controls indexing and public exposure:

- `PRIVATE`: server content is private and noindexed.
- `UNLISTED`: server may be reachable but noindexed.
- `PUBLIC`: public agent profile pages may be indexed when the agent is also public.

An environment variable named `SERVER_VISIBILITY` overrides the metadata value.

## Default Agent Visibility

`DEFAULT_VISIBILITY` controls the fallback visibility for new agents when the book source does not declare `META VISIBILITY`.

The current default is `UNLISTED`.

Agent visibility itself is sourced from book metadata and mirrored into the `Agent.visibility` column. See [Agents](agents.md).

## Server Limits

`ServerLimit` stores numeric limits. Dedicated rows override legacy metadata mirrors, which override built-in defaults.

Defined limits:

- `TIMEOUT_MAX_ACTIVE_PER_CHAT`: default `5`, minimum `1`.
- `TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT`: default `10`, minimum `1`.
- `MAX_FILE_UPLOAD_SIZE_MB`: default `50`, minimum `1`.
- `FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS`: minimum `0`, step `100`.
- `SPAWN_AGENT_MAX_DEPTH`: default `2`, minimum `1`.
- `SPAWN_AGENT_RATE_LIMIT_MAX`: default `5`, minimum `1`.
- `SPAWN_AGENT_RATE_LIMIT_WINDOW_MS`: default `600000`, minimum `1000`.
- `LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS`: default `3`, minimum `1`.
- `LOCAL_AGENT_RUNNER_MAX_PARALLEL_MESSAGES`: default `3`, minimum `1`.

Updating server limits MUST normalize all known limits and keep deprecated metadata mirrors synchronized where older code paths still read them.

## Configuration Caching

Middleware and runtime helpers MAY cache metadata and server-registry values briefly. Cache keys MUST include the table prefix or server identity so one logical server cannot leak configuration into another.

