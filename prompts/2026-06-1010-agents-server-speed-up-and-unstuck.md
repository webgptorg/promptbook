[ ] !!

[✨⇨] It takes a long time to process the messages, speed it up

-   The messages sometimes takes a long time to answer, sometimes they stuck on "Local agent runner did not finish the queued message within 30 minutes."
-   Allow to run 3 instances of the harness in parallel, add this to the limits page
-   Run the harness immediately after the message is queued, do not wait for the previous message to finish or some cron to trigger the next message
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
