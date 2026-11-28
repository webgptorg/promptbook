[x] by Claude Code `claude-opus-5` thinking `max` - Implementation 2.51 19 minutes; Testing 4 minutes

[✨🔘] Track not only the harness and model, but also the agent. 

```bash
ptbk coder run --harness openai-codex --model gpt-5.6-astra --thinking-level max --agent agents/coding/developer.book --context AGENTS.md
```

**So this:**

```
[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~.13 23 minutes
```

**Will became this:**

```
[x] by Developer on OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~.13 23 minutes
```

-   The "Developer" is name of the agent `agents/coding/developer.book`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if there are any changes that affect the landing page.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

