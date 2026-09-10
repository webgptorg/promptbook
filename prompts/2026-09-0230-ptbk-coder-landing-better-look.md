[-]

[✨🎿] qux

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --harness openai-codex --model gpt-5.6-astra --thinking-level max --agent agents/coding/developer.book --context AGENTS.md
```

-   @@@@@@@
-   Section "Ship a backlog, not a stream of interruptions." looks pretty shitty
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if there are any changes that affect the landing page.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](screenshots/2026-09-0230-ptbk-coder-landing-better-look.png)
