[ ]

[🗄️🛟] Backup Supabase locally (all tables) via script + terminals.json registration

-   *(@@@@ Written by agent)*
-   We need a simple, repeatable way to create a local backup (schema + data) of our Supabase Postgres database(s), primarily for safety, debugging, and local/offline analysis.
-   Create a new script that connects to the remote Supabase Postgres instance and produces a timestamped dump file locally.
-   Prefer using `pg_dump` (or Supabase CLI `supabase db dump` if already used in the repo) rather than re-implementing data export through APIs, because we need a faithful backup of all tables (including constraints, indexes, sequences, etc.).
-   Output format:
    -   Default: one compressed file per backup (e.g. `backups/supabase/YYYY-MM-DD_HH-mm-ss.dump` in custom format, or `.sql.gz` if that’s simpler for restore).
    -   Include schema + data.
    -   Include all schemas that contain application tables (default `public`, but do not hardcode; allow configuration).
-   Configuration:
    -   Read connection details from env vars (do not commit secrets):
        -   `SUPABASE_DB_URL` (preferred, full Postgres connection string)
        -   or `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`
    -   Support selecting which server/environment to backup via a parameter (e.g. `--server=@@@`), consistent with how Promptbook handles multiple servers/environments.
    -   Support output directory override (e.g. `--output=backups/supabase`).
-   Safety & UX:
    -   Print clear logs: which server is being backed up, where file is being written, size after completion.
    -   Fail with actionable error messages when required env vars / tools are missing (e.g., `pg_dump` not installed).
    -   Never echo passwords/connection strings into logs.
-   Registration:
    -   Register this script in `terminals.json` so it’s runnable from the repo’s terminal runner.
    -   Add a short description and example arguments in that entry.
-   Files / places in project:
    -   New script under `scripts/backup-supabase` (or `scripts/backup-supabase/backup-supabase.ts`)
    -   `terminals.json` @@@ (confirm path/name; it wasn’t found at repo root on branch `prds`)
    -   Potential shared helpers in `scripts/utils` (for argument parsing, env reading, timestamp formatting)
    -   `.gitignore` should ignore backup output directory (e.g. `backups/`), unless already covered.
-   Acceptance criteria:
    -   Running the terminal command produces a backup file locally containing all tables.
    -   The dump can be restored into a local Postgres (manual verification steps documented inline in the script/help output).
    -   Script works on macOS + Linux; Windows support @@@.
-   Out of scope:
    -   Automated scheduled backups/cron.
    -   Backing up Supabase Storage buckets (files) (could be separate follow-up PRD).
-   Notes:
    -   Supabase docs recommend using the project connection string (often via the “Session pooler” URI) and `pg_dump` for backup/restore flows.
