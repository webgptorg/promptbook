[ ]

[✨🆓] Add `qwen-code` harness to `ptbk coder`

```bash
ptbk coder run --harness qwen-code --model qwen3.8-max --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md
```

-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Look how `openai-codex` and `claude-code` harnesses are implemented and follow a similar approach for `qwen-code`.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look at [the dev scripts in `terminals.json`](.vscode/terminals.json) and add newly created scripts for `qwen-code`.
-   Update the [`ptbk coder` landing website](apps/coder-landing) and list Qwen Code as a supported harness.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
