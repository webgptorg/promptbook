[x]

[✨🚃] Create system for sending and receiving emails

-   There should be ability to send and receive emails for agents
-   Make plugin structure for that, see how for example LLM providers or scrapers are structured
-   Bring the logic from [WebGPT app](C:/Users/me/work/webgpt/webgpt-app/scripts/send-emails)
-   Look on abstract [Message object](/src/types/Message.ts) and base the logic and structure of messages on that
-   Create table `Message`, there should be place for inbound messages and queue for outbound messages /\_(structure of this table should be based on `Message` object)
-   Create table `MessageSendAttempt` that will store each attempt to send the message
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
    -   When using table names in supabase queries, use the `$getTableName` utility function to get the correct table name with prefix, for example: `await supabase.from(await $getTableName('Agent')).select('...')`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🚃] Create a page that will show list of all messages (inbound and outbound) and their send statuses

-   The page should be located on `/admin/messages`
-   Data should be based on tables `Message` and `MessageSendAttempt`
-   Add this in the menu under "System -> Messages & Emails"
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🚃] Add option to send email directly from administration

-   The page should be located on `/admin/messages/send-email`
-   This page will be primarily for testing purposes, to test that the Agents Server is able to send emails correctly
-   Data should be based on tables `Message` and `MessageSendAttempt` using [sendMessage function](/apps/agents-server/src/utils/messages/sendMessage.ts)
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x]

[✨🚃] Add ability to recieve emails

-   There is implemented logic for sending emails, now add also ability to receive emails
-   Bring the logic from [WebGPT app](C:/Users/me/work/webgpt/webgpt-app/scripts/send-emails), look especially on [parseInboundSendgridEmail.ts](C:/Users/me/work/webgpt/webgpt-app/src/utils/emails/providers/sendgrid/parseInboundSendgridEmail.ts)
-   Look on abstract [Message object](/src/types/Message.ts) and base the logic and structure of messages on that
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
