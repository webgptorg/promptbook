[ ] !

[✨🤲] Do not run `generate-boilerplates` during `ptbk coder init` if `prompts/` already contains real prompts

```bash
ptbk coder init
```

-   Skip boilerplate generation when `prompts/` is non-empty
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if necessary.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
