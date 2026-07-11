# Transfer and Backup

How agents move between servers and how a server's state is exported. Everything is book-centric: because a book is the [single source of truth](../agents.md#persisted-agent-state) for an agent's behavior, plain `.book` files are the portable format.

## Agents export

`GET /api/agents/export[?folderId=N]` (signed-in) streams a ZIP (`<server-name-slug>.agents.zip`) containing one `.book` file per active agent, laid out in directories mirroring the [folder tree](folders-and-organization.md) (optionally scoped to a folder subtree via `folderId`). Filenames are sanitized path segments of the agent names.

## Agents import

`POST /api/agents/import` (signed-in) accepts dropped `.book` files and/or ZIP archives (non-book entries are reported as ignored):

-   ZIP directory structure is recreated as folders under the optional target folder (existing folders with the same name+parent are reused; new ones get appended `sortOrder`).
-   **Duplicate handling** compares normalized book sources against active agents with the same name: identical books are skipped silently; same-name-different-book conflicts follow the requested resolution — `ASK` (return conflicts for a user decision), `SKIP`, or `DUPLICATE` (import as an additional agent; names are [not unique](../agents.md#identity)).
-   Imported agents go through the normal [creation](../agents.md#creation) path (fresh `permanentId`, history entry, default visibility unless the book declares one, [preparation](preparation-and-caching.md) scheduling).

## Cloning

`POST /api/agents/:agentName/clone` (signed-in) creates a copy of an agent with a new name, defaulting to the **same folder** as the source. The clone is a regular new agent (own `permanentId`, own history starting from the cloned source).

## Transpiled export

`/agents/:agentName/export-as-transpiled-code` exports an agent as standalone runnable code so it can live outside any Agents Server:

-   `GET …/api?transpiler=<name>` returns the generated code; `GET …/api/download` downloads it with proper file metadata (extension/mime derived from the transpiler — Python for LangChain-style targets, TypeScript/JavaScript otherwise).
-   Available transpiler targets come from the engine's transpiler registry (e.g. OpenAI SDK, OpenAI Agents, Anthropic Claude SDK/managed, E2B, Agent OS, formatted markdown book). Unknown transpiler names MUST yield a clear error listing the supported targets.
-   The export uses the **resolved** source (inheritance applied), so the generated code is self-contained.

## Books backup

`GET /api/admin/backups/books` (admin) streams the whole instance's `.book` tree as a ZIP — same layout as the agents export but including hidden folders; intended as a quick "just the books" backup.

## Server backup

`GET /api/admin/backups/server` (admin; UI `/admin/backup`) streams a full-instance ZIP composed of selectable **sections**; each section is a directory in the archive:

| Section key | Contents | Notes |
| --- | --- | --- |
| `metadata` | [Metadata](../configuration.md#metadata) and [server limits](../configuration.md#server-limits) as one JSON key/value file. | Also available standalone: `GET /api/metadata/export` (and re-import via `POST /api/metadata/import`). |
| `agents` | `Agent`, `AgentFolder`, `AgentHistory`, `AgentExternals` tables + the `.book` tree. | |
| `conversations` | One JSON export per conversation + feedback records. | |
| `users` | User/identity data. | |
| `files` | Stored file records. | |
| `messages` | [Message log](../integrations/email.md) records. | |
| `security` | Tokens and authentication records. | |
| `caches` | Cache tables. | Marked *excluded* by default — exportable only deliberately (regenerable data). |

Sections marked `excluded` are not offered for normal export. The backup format favors re-importability: table data as JSON plus books as plain text.

## Related

-   [Federation](federation.md) — referencing/importing agents from other servers without moving them.
-   [Migrations](../operations/migrations.md) — schema-level compatibility that keeps backups restorable across versions.
