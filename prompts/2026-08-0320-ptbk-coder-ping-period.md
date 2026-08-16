[ ]

[✨🐪] Add optional `--period` flag to `ptbk coder ping`

```bash
ptbk coder ping --harness claude-code --model claude-sonnet-5 --thinking-level low --period 5h
```

-   When present the ping will be sent every `period` time, which is a duration string like `5h`, `30m`, `1h30m`, etc.
-   When present the ping will run indefinitely until the user stops it with `CTRL+C` or the process is killed.
-   When not present the ping will be sent only once, as it is currently implemented.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   For example parsing of the duration string is already implemented, just reuse it.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Look at [the dev scripts in `terminals.json`](.vscode/terminals.json) and add script for pinging claude every 5 hours
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) and show this ad advanced perk to always ping the harness every 5 hours to keep the Claude code 5h limit already and always running without spending almost any tokens
-   Add the changes into the [changelog](changelog/_current-preversion.md)
