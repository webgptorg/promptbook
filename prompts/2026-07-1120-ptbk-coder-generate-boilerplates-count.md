[ ]

[✨🔩] qux

```bash
ptbk coder generate-boilerplates --count 10 --template prompts/_templates/common.md
```

-   @@@@@@@@@@@@@@@@@@@@@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json) and the boilerplate creation scripts set to `--count 5*1`
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
