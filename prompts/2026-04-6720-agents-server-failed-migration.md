[ ] !

[✨🤏] Add more details when migration fails

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ git branch --force preview main && git push origin preview --force-with-lease && (cd ./apps/agents-server/ && npx tsx ./src/database/migrate.ts --only=preview)
Enumerating objects: 11, done.
Counting objects: 100% (11/11), done.
Delta compression using up to 6 threads
Compressing objects: 100% (7/7), done.
Writing objects: 100% (7/7), 26.01 KiB | 194.00 KiB/s, done.
Total 7 (delta 3), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (3/3), completed with 3 local objects.
remote:
remote: GitHub found 138 vulnerabilities on webgptorg/promptbook's default branch (4 critical, 73 high, 56 moderate, 5 low). To find out more, visit:
remote:      https://github.com/webgptorg/promptbook/security/dependabot
remote:
To https://github.com/webgptorg/promptbook.git
   2a7a5475d..453afe283  preview -> preview
🚀 Starting database migration
🗂️ Loaded 33 registered servers from `_Server`.
🎯 Running migrations only for: preview
📂 Found 65 migration files
📋 Found 10 prefixes to migrate: server_ChutooTest_, server_CoreTest_, server_Demo_, server_JiriJahn_, server_Mangoweb_, server_NeonMedia_, server_PasuTest_, server_PavolHejny_, server_Praha13Test_, server_Ptbk_
🔌 Connected to database
🔒 Waiting for migration lock

❌ Migration failed:
error: canceling statement due to statement timeout
    at C:\Users\me\work\ai\promptbook\node_modules\pg\lib\client.js:545:17
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async acquireMigrationExecutionLock (C:\Users\me\work\ai\promptbook\apps\agents-server\src\database\acquireMigrationExecutionLock.ts:55:5)
    at async runDatabaseMigrations (C:\Users\me\work\ai\promptbook\apps\agents-server\src\database\runDatabaseMigrations.ts:237:28)
    at async migrate (C:\Users\me\work\ai\promptbook\apps\agents-server\src\database\migrate.ts:28:9) {
  length: 109,
  severity: 'ERROR',
  code: '57014',
  detail: undefined,
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'postgres.c',
  line: '3405',
  routine: 'ProcessInterrupts'
}
```

-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) with the migrations
-   If you need to do the database migration to fix the migrations, do it

---

[-]

[✨🤏] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🤏] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🤏] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
