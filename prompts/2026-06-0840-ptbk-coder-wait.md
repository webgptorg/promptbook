[ ] !!!!

[✨🐷] Break up the --wait to --wait-after-prompt --wait-between-prompts and --wait-after-error

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md
```

-   _(@@@ wait for wait)_
-   The --wait will become --wait-after-prompt
-   You are adding two new options: --wait-between-prompts and --wait-after-error
-   This is the difference between the three options:
    -   --wait-after-prompt: wait this long after the prompt is implemented, verified and commited (now this is --wait)
    -   --wait-between-prompts:
    -   --wait-after-error: wait
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

The visialiosation of --wait-between-prompts vs --wait-after-prompt is as follows:

```

```
