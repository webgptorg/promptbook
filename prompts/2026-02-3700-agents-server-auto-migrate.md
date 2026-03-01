[x] ~$0.3690 25 minutes by OpenAI Codex `gpt-5.3-codex`

---

[ ]

[✨🔥] Server should be able to automatically migrate

-   Currently there is a script to migrate the database, but it is not automatic, and it requires manual running of the script. The server should be able to automatically migrate the database when it detects that there is some unapplied migration, without the need for the user to manually run the migration script. This will make it easier for users to update the server and keep it up to date with the latest changes, without the need for manual intervention.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Same logic of migration should be reused both in the script and in the automatic migration process of the server.
-   Do a proper analysis of the current functionality of the migrations before you start implementing.
-   In the migration table there should be a column to identify if the migration was applied automatically by the server or manually by the user, this will help us to track how the migrations are being applied and if there are any issues with the automatic migration process.
-   You are working with the [Agents Server](apps/agents-server)
-   Do the database migration for this to add the column to identify if the migration was applied automatically or manually
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔥] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔥] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔥] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
