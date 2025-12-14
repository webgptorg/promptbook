[ ]

[✨💶] Create table that tracks uploads

-   Whenever user uploads a file, we need to track these uploads in the database.
-   Implement this tracking as a wrapper of `IIFilesStorageWithCdn`, make function that wraps any `IIFilesStorageWithCdn` implementation to add tracking of uploads to the database.
-   `$provideCdnForServer` should use this wrapper and return the wrapped `IIFilesStorageWithCdn` instance.
-   For each upload we need to track:
    -   `id` (primary key)
    -   `userId` (reference to `User` table)
    -   `fileName`
    -   `fileSize` (in bytes)
    -   `fileType` (mime type)
    -   `cdnUrl` (url to the file in CDN)
    -   `purpose` (e.g., "KNOWLEDGE", "SERVER_FAVICON_URL", "SERVER_LOGO_URL", "IMAGE_GENERATION", etc.)
    -   `createdAt`
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
    -   When using table names in supabase queries, use the `$getTableName` utility function to get the correct table name with prefix, for example: `await supabase.from(await $getTableName('Agent')).select('...')`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨💶] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨💶] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨💶] qux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
