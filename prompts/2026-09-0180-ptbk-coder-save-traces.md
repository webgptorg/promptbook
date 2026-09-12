[x] by Claude Code `claude-opus-5` thinking `max` - Implementation 1.25 4 hours; Testing 15 minutes

[✨🌴] Promptbook coder should save the run traces.

```bash
ptbk coder run --harness openai-codex --model gpt-5.6-astra --thinking-level max --agent agents/coding/developer.book --context AGENTS.md
```

-   Save the run traces of the `ptbk coder` command for later analysis.
-   Save it to `prompts/traces`
-   Name the trace file in same as prompt file.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if there are any changes that affect the landing page.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

