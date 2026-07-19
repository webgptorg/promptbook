[x] ~$1.14 2 hours by OpenAI Codex `gpt-5.5` (ChatGPT account)

[✨🙍] Show the sources in some nicer way

-   When the agent replies to the user, it can show the sources in the chip bellow the message
-   Some chips are great but some are ugly and not very readable, for example the sources with long URLs
    -   "🌐[{"id":1239608413,"node_id":"R_kgDOSeLsXQ","name":"ai-supervize-2026-05-15" - show either source as URL snippet like `github.com/.../foo.json` or if the URL is unknown just "JSON file"
    -   "����JFIF��� " - show something more meaningful - show either source as URL snippet like `imgur.com/.../foo.png` or if the URL is unknown just "PNG image"
-   Show more meningful icons:
    -   For websites keep the globe icon "🌐" but use better graphic
    -   For images use that image thumbnail
    -   For JSON files use a JSON icon
    -   etc. for other file types do something similar
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](screenshots/2026-07-0510-agents-server-better-sources-display.png)
![alt text](screenshots/2026-07-0510-agents-server-better-sources-display-1.png)
![alt text](screenshots/2026-07-0510-agents-server-better-sources-display-2.png)
![alt text](screenshots/2026-07-0510-agents-server-better-sources-display-3.png)

