[x] by Promptbook Developer on OpenAI Codex `gpt-6-astra` thinking `max` (ChatGPT account) - Implementation ~$0.5253 18 minutes; Testing 2 minutes

[✨🦖] Automatically use the newest model of each harness.

-   For example, for OpenAI Codex harness the default model is `gpt-6-astra`
-   Look at all harnesses and feature the flagship models.
-   This is relevant for:
    -   `ptbk coder init`
    -   `ptbk coder run`
    -   Other commands that rely on harness models.
    -   The [`ptbk coder` landing website](apps/coder-landing)
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json), they should contain the latest model references for each harness which is already in use.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   You are working with the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

