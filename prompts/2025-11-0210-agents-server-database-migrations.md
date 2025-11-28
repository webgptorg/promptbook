[x]

[✨🙅] Implement propper server migrations in Agents Server

-   Agent server is using Supabase as database
-   Agent server is deployed through Vercel
-   Now there is no proper database migration system implemented, just single SQL file which creates everything `/apps/agents-server/src/database/schema.sql`
-   Relevant file is `/apps/agents-server/src/database/$provideSupabaseForServer.ts`
-   It should work for example in the `Agents Server` application `/apps/agents-server`
-   Be aware that it Supabase can be multiple prefixed sets of tables in one database, so the migration system should handle that properly
-   Migration files should `.sql` files like `/apps/agents-server/src/database/migrations/2025-11-0210-some-name-for-migration.sql`
-   Create `migrate` script in `/apps/agents-server/package.json`
-   Take all prefixes to migrate from environment variable like `SUPABASE_MIGRATION_PREFIXES=project1_,project2_,project3_`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🙅] bar

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🙅] bar

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🙅] bar

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
