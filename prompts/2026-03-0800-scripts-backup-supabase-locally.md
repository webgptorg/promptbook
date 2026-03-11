[ ]

[🗄️💿] Backup Supabase locally (all tables) via script

-   We need a simple, repeatable way to create a local backup (schema + data) of our Supabase Postgres database(s), primarily for safety, debugging, and local/offline analysis.
-   Create a new script that connects to the remote Supabase Postgres instance and produces a timestamped dump file locally.
-   Use commander.js
-   Do not use `pg_dump`, as it may not be available in all environments and adds complexity; instead, use what is available here in a repository, look at migration scripts for reference on how to connect to the database and export data.
-   Add it in to `terminals.json` and allow to run it via the terminal runner instantly without needing to remember the exact command or parameters.
-   Output format:
    -   Default: one compressed file per backup (e.g. `backups/supabase/YYYY-MM-DD_HH-mm-ss.sql.zip`)
    -   Into the script pass the output directory and filename pattern as arguments.
    -   In the `terminals.json` entry, provide an path `other/backup`
    -   Inside the file, each table should be represented as a separate SQL file
    -   Include schema + data.
    -   Include all schemas that contain application tables (default `public`, but do not hardcode; allow configuration).
-   Safety & UX:
    -   Get inspiration from migration script how to log
    -   Print clear logs: which server is being backed up, where file is being written, size after completion.
    -   Never echo passwords/connection strings into logs.
-   Registration:
    -   Register this script in `terminals.json` so it’s runnable from the repo’s terminal runner.
    -   Add a short description and example arguments in that entry.
    -   Script should be under `scripts` folder
-   Out of scope:
    -   Automated scheduled backups/cron.
    -   Backing up Supabase Storage buckets (files) (could be separate follow-up PRD).
