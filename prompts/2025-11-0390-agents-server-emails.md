[ ]

[✨🚃] Create system for sending and receiving emails

-   There should be ability to send and receive emails for agents
-   Make plugin structure for that, see how for example LLM providers or scrapers are structured
-   Bring the logic from [WebGPT app](C:/Users/me/work/webgpt/webgpt-app/scripts/send-emails)
-   Look on abstract [Message object](/src/types/Message.ts) and base the logic and structure of messages on that
-   Create table `Message`, there should be place for inbound messages and queue for outbound messages \_(structure of this table should be based on `Message` object)
-   Create table `MessageSendAttempt` that will store each attempt to send the message
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
    -   When using table names in supabase queries, use the `$getTableName` utility function to get the correct table name with prefix, for example: `await supabase.from(await $getTableName('Agent')).select('...')`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🚃] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🚃] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🚃] quux

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
