[ ]

[✨🤺] When running `ptbk coder run` allow prompts with no `[ ]`

-   When the prompt has no `[ ]` checkbox, it should still be processed in same way as prompts with `[ ]`
-   When there is no `[ ]`, `[-]`, `[x]`, `[^]`, `[!]`,... checkbox, the `ptbk coder run` / `ptbk coder server` should behave in the same way as if there was a `[ ]` checkbox.
-   When the prompt starts with no `[ ]` checkbox, it should still be treated as if it had a `[ ]` checkbox.
-   After the prompt start to being processed, the `[^]` -> `[x]` should be added there as if it had a `[ ]` checkbox initially.
-   The prompt with no `[ ]` checkbox has priority `0` _(same as if there is no `[ ] !`)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts) if there are any changes that affect the landing page.
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
