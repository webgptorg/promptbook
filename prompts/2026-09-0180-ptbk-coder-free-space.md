[x] by Claude Code `claude-opus-5` thinking `max` - Implementation 1.56 25 minutes; Testing 15 minutes

[✨🌴] Promptbook coder should handle low disk space gracefully.

```bash
ptbk coder run --harness openai-codex --model gpt-5.6-astra --thinking-level max --agent agents/coding/developer.book --context AGENTS.md
```

-   Check for available disk space before running the `ptbk coder` command.
-   If the disk space is low, display a warning message and prevent the command from running.
-   Check during the execution of the `ptbk coder` command as well, and pause if the disk space becomes critically low.
    -   Do not pause only if `--no-questions` is specified.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

