[x] (2 attempts) $0.6990 an hour by Claude Code

[✨🐷] Break up the `--wait` to `--wait-after-prompt`, `--wait-between-prompts` and `--wait-after-error`

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --wait-after-prompt 5s --wait-between-prompts 5h --wait-after-error 10m
```

-   The --wait will become --wait-after-prompt
-   You are adding two new options: --wait-between-prompts and --wait-after-error
-   This is the difference between the three options:
    -   `--wait-after-prompt`: wait this long after the prompt is implemented, verified and commited _(now this is --wait, default 0) _
    -   ` --wait-between-prompts`: wait this long between start of one prompt and start of the next prompt regardless the duration of the task, if task takes more time then `--wait-between-prompts` starts immediately _(default 0)_
    -   `--wait-after-error`: wait before retrying the prompt after an error occurs _(default 10m)_
-   When error occurs, wait this long before retrying the prompt _(default 10m)_ do 3 retries before giving up
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Show type of waiting in the web and terminal UI
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
    -   By default waiting after error should be 10m
    -   For Claude, waiting between prompts should be 5h
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

The visualization of `--wait-between-prompts` vs `--wait-after-prompt` is as follows:

🟥 The work itself
🟩 Waiting between prompts
🟦 Wait after prompt

```
--wait-between-prompts 4h
--wait-after-prompt 2h

🟥🟥🟩🟩|🟥🟥🟥🟩🟦|🟥🟥🟥🟥🟥🟥🟦🟦
Task 1    | Task 2     | Task 3
```

1. Task 1 takes 2h, then wait next 2h to match both `--wait-between-prompts 4h` and `--wait-after-prompt 2h` before starting Task 2
2. Task 2 takes 3h, then wait next 1h to match `--wait-between-prompts 4h` and 1h to match `--wait-after-prompt 2h` before starting Task 3
3. Task 3 takes 6h, then wait next 2h to match `--wait-after-prompt 2h` before starting Task 4

