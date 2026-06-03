# 🔠 Promptbook Agents server

Agents Server is the main web application where Promptbook agents live

## Local CLI configuration

The installed CLI can initialize a local Agents Server project before it starts the packaged web app:

```bash
npm install ptbk
ptbk agents-server init
ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh
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
-   [☁] For testing servers, look at the server and change the `CORE_SERVER` to `https://core-test.ptbk.io/`
