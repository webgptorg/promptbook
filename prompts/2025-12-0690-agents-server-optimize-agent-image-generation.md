[ ]

[✨🥵] When the default agent avatar image is being generated, it generates multiple images instead of 1

-   There is a working cache for avatar images
-   When the image is loaded for the first time, it caches the image and next time it loads from cache
-   But the agent page contains multiple places where the avatar image is shown (agent card, chat header, chat messages)
-   So when the avatar image is not cached yet, it requests multiple images at the same time, causing multiple images to be generated and cache is replaced multiple times
-   Fix the logic so that only one image is generated and cached, and all other requests wait for that one to finish and then use the cached image
-   Implement some locking or similar mechanism to ensure only one image generation is in progress at a time for a given agent
-   If needed, create database migration for the locking mechanism
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
    -   When using table names in supabase queries, use the `$getTableName` utility function to get the correct table name with prefix, for example: `await supabase.from(await $getTableName('Agent')).select('...')`
    -   Update the schemas in `/src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase.ts` and `/src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentsDatabaseSchema.ts`
-   Avatar images are in URL such as https://s6.ptbk.io/agents/david-black/images/default-avatar.png
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🥵] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🥵] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🥵] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
