[x] $2.91 an hour by Claude Code

[✨🕤] Create `ptbk coder server`

```bash
ptbk coder server --harness github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --port 4441
```

-   The `ptbk coder server` will do exactly the same as `ptbk coder run` with two differences:
    -   It will start a server that will listen for incoming requests on the specified port _(default is `4441`)_
    -   It will not exit after processing the prompts but watch for new prompt files and changes
-   It will serve the simple page with will show in kan-ban style the list of prompts and their status
-   Allow to edit the prompt in Trello style and when the prompt is changed, it will edit the prompt file on the backend correspondingly
-   There will be button to play / pause on the server, it will be in sync with `PAUSED` status in CLI
-   In CLI share the same logic as in `ptbk coder run` and `ptbk coder server`
-   You can do the frontent of the app in the folder `apps/coder-server`, the backend will be in the cli command
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share same logic from `ptbk coder run` and `ptbk coder start`
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ] !!!

[✨🕤] Modify UI in `ptbk coder server`

```bash
ptbk coder server --harness github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --port 4441
```

-   In the terminal UI there should be a link to open the server page in the browser, for example `http://localhost:4441` _(which isnt in `ptbk coder run`, but still reuse the existing UI between the `ptbk coder` commands)_
-   In the Web UI the columns should be following:
    1. Backlog, for both [-] and prompts containing @@@
        - Add two marks/flags in UI to indicate if the prompt is in backlog because of [-] or because it contains @@@
    2. Low priority, for prompts which are ready but have lower priority then `--priority` specified
    3. To do, for prompts which are in the queue and ready to be processed
    4. In progress, for prompts which are currently being processed by the agent (for now there will be only one or no prompt in this column)
    5. Done recently, for prompts which are done by this agent session server
    6. Done, for prompts which are done by any agent session server
    7. Errors recently, for prompts which are done with error by this agent session server
    8. Errors, for prompts which are done with error by any agent session server
-   Keep in mind the DRY _(don't repeat yourself)_ principle
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
