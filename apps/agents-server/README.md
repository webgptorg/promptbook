# 🔠 Promptbook Agents server

Agents Server is the main web application where Promptbook agents live

## Local CLI configuration

The installed CLI can initialize a local Agents Server project before it starts the packaged web app:

```bash
npm install ptbk
ptbk agents-server init
ptbk agents-server start --harness github-copilot --model gpt-5.4 --thinking-level xhigh
```

`ptbk agents-server init` adds missing placeholders to `.env` and local runtime exclusions to `.gitignore` without deleting existing configuration. Use `PTBK_AGENTS_SERVER_DATABASE=supabase` for a Supabase-backed server or `PTBK_AGENTS_SERVER_DATABASE=sqlite` for a standalone local database in `.promptbook`. When using Supabase, fill the initialized values from your project before starting the server. The Supabase project URL and API keys are available in the [Supabase project API settings](https://supabase.com/docs/guides/api/api-keys), and the PostgreSQL connection string is available from the [Supabase database connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

<a id="agents-server-env-ptbk-agents-server-database"></a>
-   `PTBK_AGENTS_SERVER_DATABASE`: Database backend used by Agents Server. Use `supabase` for the current hosted setup or `sqlite` for a standalone local database.

<a id="agents-server-env-ptbk-agents-server-sqlite-path"></a>
-   `PTBK_AGENTS_SERVER_SQLITE_PATH`: SQLite database file used when `PTBK_AGENTS_SERVER_DATABASE=sqlite`. Defaults to `.promptbook/agents-server.sqlite` in the launch directory.

<a id="agents-server-env-openai-api-key"></a>
-   `OPENAI_API_KEY`: OpenAI API key used for Agents Server chat and agent execution. Create one in the [OpenAI API key settings](https://platform.openai.com/api-keys).

<a id="agents-server-env-postgres-url"></a>
-   `POSTGRES_URL`: PostgreSQL connection string used by Agents Server SQL access and migrations. Copy a connection string from your Supabase database connection settings.

<a id="agents-server-env-next-public-supabase-url"></a>
-   `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase project URL used by Agents Server clients. Copy the project URL from your Supabase project API settings.

<a id="agents-server-env-next-public-supabase-anon-key"></a>
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase API key used by browser-side Supabase access. Copy the publishable or legacy anon key from your Supabase project API settings.

<a id="agents-server-env-supabase-service-role-key"></a>
-   `SUPABASE_SERVICE_ROLE_KEY`: Server-only Supabase key used by trusted Agents Server routes. Copy the service-role or secret key from your Supabase project API settings and keep it private.

<a id="agents-server-env-supabase-auto-migrate"></a>
-   `SUPABASE_AUTO_MIGRATE`: Leave this as `true` for local startup so Agents Server creates and updates the database schema automatically.

<a id="agents-server-env-admin-password"></a>
-   `ADMIN_PASSWORD`: Password for the built-in `admin` login on a self-hosted Agents Server. Choose a private value before using the admin UI.

<a id="agents-server-env-session-secret"></a>
-   `SESSION_SECRET`: HMAC signing key used to sign the session cookie. Must be set explicitly in production — the server refuses to start session signing when missing instead of falling back to a hardcoded default. Use a long random string, for example the output of `openssl rand -hex 32`. Keep it separate from `ADMIN_PASSWORD` so a leak of either credential cannot forge the other.

<a id="agents-server-env-ptbk-agents-server-user-chat-worker-token"></a>
-   `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN`: Shared internal token used to authorize background worker routes (`/api/internal/user-chat-jobs/run`, `/api/internal/user-chat-timeouts/run`, and `/api/internal/agent-runner-limits`). Must be set explicitly in production — the server refuses to resolve the worker token when missing instead of falling back to `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, or a hardcoded constant. Use a long random string, for example the output of `openssl rand -hex 32`. The CLI launcher (`ptbk agents-server start`) generates a per-process value automatically when the variable is empty so local development works without configuration.

<a id="agents-server-env-promptbook-team-agent-access-token"></a>
-   `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN`: Dedicated secret used by same-server `TEAM` calls to authorize access to private teammate agents. Must be a dedicated random string — falling back to `ADMIN_PASSWORD` or `SUPABASE_SERVICE_ROLE_KEY` would let a leak of one credential compromise both authentication boundaries. When not configured, same-server team access stays disabled (the integration fails closed) so leaving the variable empty is safe but disables the feature. Use a long random string, for example the output of `openssl rand -hex 32`.

<a id="agents-server-env-sendgrid-inbound-parse-public-key"></a>
-   `SENDGRID_INBOUND_PARSE_PUBLIC_KEY`: Public verification key from SendGrid Signed Webhook settings for `/api/emails/incoming/sendgrid`. The route verifies `X-Twilio-Email-Event-Webhook-Signature` over the raw multipart body before parsing or inserting an inbound `EMAIL` message. Configure either this public key or `SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET`; the SendGrid public-key flow is preferred.

<a id="agents-server-env-sendgrid-inbound-parse-webhook-secret"></a>
-   `SENDGRID_INBOUND_PARSE_WEBHOOK_SECRET`: Shared secret for deployments that sign SendGrid Inbound Parse callbacks with HMAC instead of SendGrid's public-key signature flow. Leave empty when `SENDGRID_INBOUND_PARSE_PUBLIC_KEY` is configured. Use a dedicated random string and keep it separate from `SENDGRID_API_KEY`, `ADMIN_PASSWORD`, and other server secrets.

<a id="agents-server-env-sendgrid-inbound-parse-hosts"></a>
-   `SENDGRID_INBOUND_PARSE_HOSTS`: Comma-separated list of public hostnames allowed to receive SendGrid Inbound Parse callbacks, for example `mail.example.com,parse.example.com`. The route rejects signed requests delivered through any other `Host` / `X-Forwarded-Host`, so point SendGrid only at the hostnames that are also protected by your reverse-proxy or platform IP allowlisting.

## Creating servers

When creating new Agents server, search across the repository for [☁]

-   [☁] [Add domain to environments](https://vercel.com/pavol-hejns-projects/promptbook-agents-server/settings/environments)
-   [☁] Add or update the server row in the global `_Server` database table
-   [☁] Run the `_Server` -> Vercel domain sync script
-   [☁] [Add to `.env` file](./.env)
-   [☁] Keep `SERVER_VISIBILITY=PRIVATE` by default; switch to `SERVER_VISIBILITY=PUBLIC` (or metadata `SERVER_VISIBILITY`) only when the server should be crawlable and expose sitemap entries for public agents
-   [☁] Optional chat default can be set via metadata `CHAT_VISUAL_MODE` (`BUBBLE_MODE` / `ARTICLE_MODE`); users can still override in the Control panel
-   [☁] If using `USE PROJECT` auto-auth, configure [GitHub App integration](./GITHUB_APP.md)
-   [☁] Add the server to [the list of our servers](https://docs.google.com/spreadsheets/d/1X26iMQqubsxftqD1EJNSlzPYFS94QjCFPXyKdHHDeVs/edit?gid=848307752#gid=848307752)
-   [☁] Run migration script _(run new instance)_
