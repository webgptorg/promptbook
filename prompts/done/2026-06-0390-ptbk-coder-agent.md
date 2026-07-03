[x] $1.22 an hour by Claude Code

[✨😇] Allow to specify an agent for `ptbk coder run`

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --agent agents/coding-expert.book
```

-   It is possible to specify all of the `--context` and `--agent`, both will be used for creating the prompt for the agent
-   Keep in mind the DRY _(don't repeat yourself)_ principle, reuse same logic from `ptbk agent chat --agent ./agents/default/generic-chatter.book`
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.6762 2 hours by OpenAI Codex `gpt-5.5`

[✨😇] The `ptbk coder init` should create a agent and in the script use `--agent`

-   It should copy agent from here (the Promptbook) `agents/default/developer.book` into the project where `ptbk coder init` is run into `agents/developer.book` and use it in the script with `--agent agents/developer.book` flag

