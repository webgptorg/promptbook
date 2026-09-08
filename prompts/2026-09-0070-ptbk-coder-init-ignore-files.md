[x] by OpenAI Codex `gpt-5.6-terra` thinking `max` - Implementation ~.10 an hour; Testing 20 minutes

[✨🍭] The promptbook coder `ptbk coder init` should add entries to the ignore file for all harnesses

```bash
ptbk coder init
ptbk coder run --harness qwen-code --model qwen3.8-flash --thinking-level max --agent agents/coding/developer.book --context AGENTS.md
```

-   The adding of the ignore entries is done by the `ptbk coder init` and do it for all harnesses.
-   When the `ptbk coder run` / `ptbk coder server` / `ptbk coder ping` is run with some specific harness and that harness has missing ignore entries, user should be asked to add the missing entries to the ignore file.
-   For example in ignore there should be entries like `.qwen` files.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   The logic for adding ignore entries should be centralized and reusable across all harnesses and all commands and situations where this logic is needed
    -   The asking of user should be consistent (for example we already ask for harness self-update)
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if there are any changes that affect the landing page.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

