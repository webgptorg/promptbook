[ ]

[✨🥨] Make `ptbk coder verify` support `--order` option

```bash
ptbk coder verify --order from-latest
```

-   Now there is `--reverse` option for `ptbk coder verify` command, change it to `--order` option with values `from-latest` and `from-earliest` (default one) and `random`
-   `--order` can have values `from-latest` and `from-earliest` (default one) and `random`
-   `ptbk coder verify --reverse` will become `ptbk coder verify --order from-latest`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
