[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$1.03 an hour; Testing 28 minutes

[✨🏷] Create command `ptbk coder ping`

```bash
ptbk coder ping --harness openai-codex --model gpt-5.6-sol --thinking-level xhigh
```

-   This command will do some dummy work to that harness and model. 
-   Purpose of this is to test the connection to the harness / model and to test the response time of the harness / model. Also it can trigger start using of the weekly / hourly quota of the harness / model. It can be used to start consumation of the quota before you need it so when you need it, the quota is already consumed and refresh time is already started. It can be used to just test the connection to the harness / model.
- It should do some small dummy work and return the result of the work and the time it took to do the work. 
- It should keep the project in the same state as when it started. 
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Add ping to codex and claude code to [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) and add this to the advanced perks
-   Add the changes into the [changelog](changelog/_current-preversion.md)

