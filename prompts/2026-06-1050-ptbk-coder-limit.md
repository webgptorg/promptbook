[x] $1.44 23 minutes by Claude Code

[✨🦝] Add `--limit` option to `ptbk coder run`

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --limit 2
```

-   When set, the `--limit` option will limit the number of runs and will stop the execution after the limit is reached
-   By default, limit isnt set
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Look at [the dev scripts in `terminals.json`](.vscode/terminals.json) and add script for zig-zag between Codex and Claude using `--limit 1` option
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

