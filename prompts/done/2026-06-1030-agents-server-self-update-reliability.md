[x] ~$0.4361 an hour by OpenAI Codex `gpt-5.5`

[✨🤪] The self-update sometimes fails on "next-build exited with code null."

-   Sometimes it fails, sometimes it works, sometimes it works
-   Look at the [log file](prompts/2026-06-0930-agents-server-fix-update.log), its example of such a fail from previous update
-   The running update session should be visible in task manager
-   You can look at testing server https://s24.ptbk.io/ or ssh into the VPS `s24.ptbk.io` and check the logs
-   Make the self-update more reliable, so that it works every time
-   On `/admin/update` of Agents server you can trigger the self-update of the server
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[x] $5.34 an hour by Claude Code

[✨🤪] The running update session should be visible in task manager as a task

-   On `/admin/update` of Agents server you can trigger the self-update of the server
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

