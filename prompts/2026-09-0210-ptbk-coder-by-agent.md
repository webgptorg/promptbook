[x] by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account) - Implementation ~.32 an hour; Testing 17 minutes

[✨🎻] Allow to specify the agent in the prompt

```bash
ptbk coder run --harness openai-codex --model gpt-5.6-astra --thinking-level max --agent agents/coding/developer.book --context AGENTS.md
```

-   You can already specify the harness or model, allow also to specify the agent.
-   Both `agents/coding/developer.book`, `developer.book` and `developer` should work
    -   Also `Developer Foo bar` should work - The name of the agent from the 1st line of the book file.
-   Allowto combine, the specifying, the harness, model, or agent,
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json), Alongside the `developer` add there `unslopper`
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

