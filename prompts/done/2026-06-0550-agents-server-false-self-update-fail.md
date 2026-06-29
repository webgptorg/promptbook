[x] ~$0.6559 an hour by OpenAI Codex `gpt-5.5`

[✨🧐] The self-update of the Agents server works propperly but it shows error

-   On `/admin/update` of Agents server you can trigger the self-update of the server, it works propperly and updates the server to the latest version but it shows error despite the update is successful.
-   It shows error "The previous background update process stopped unexpectedly before writing its final status."
-   Show the error only when the update process actually fails, not when it succeeds. If the update is successful, show a success message instead.
-   The problem is maybe in fact that during the update process, the server is restarted and the page loses connection to the server, which is interpreted as an error, but in fact it is expected behavior during the update process. So the UI should be able to distinguish between an actual failure and a successful update that involves a server restart.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

![alt text](screenshots/2026-06-0550-agents-server-failse-self-update-fail.png)

