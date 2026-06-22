[ ]

[✨🧐] The self-update of the Agents server should show more info

-   On `/admin/update` of Agents server you can trigger the self-update of the server
-   Show information how many commits behind and and how much time behind the server is from the latest version
-   Also allow to update to any arbitrary commit, not just the 4 predefined releases
    -   But warn the user if they try to update to a commit that is not a release, because it might be unstable and not properly tested
-   Format the dates in human-readable format, for example "2 days ago" instead of "2026-06-01T12:00:00Z", use moment.js which is already used in the project for date formatting, the localization should be according to the active language of the UI
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

![alt text](screenshots/2026-06-0550-agents-server-failse-self-update-fail.png)
