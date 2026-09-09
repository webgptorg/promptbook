[x] by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account) - Implementation ~$0.8908 39 minutes; Testing 13 minutes

[✨🤛] Implement `ptbk coder list`

```bash
ptbk coder list
```

-   This command will list all the prompts which should be run by their priority, but do not run them.
-   Allow specifying harness and model for prompts which are filtered out.
-   Allow specifying priorities
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Add new command to [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) to a reflect the changes
-   Add the changes into the [changelog](changelog/_current-preversion.md)

