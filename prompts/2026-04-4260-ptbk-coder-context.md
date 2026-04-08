[ ]

[✨🤒] Allow to pass `--context` into `ptbk coder run` referencing file or string with extra instructions

```bash
## Locally
$ npx ts-node ./src/cli/test/ptbk.ts coder run --context AGENTS.md

## On extarnal project as dependency
$ npm install ptbk
$ ptbk coder run --context AGENTS.md
```

-   Not the [context is hardcoded](scripts/run-codex-prompts/common/createCodingContext.ts) but it should be taken dynamically from passed file
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Also update [`terminals.json` file with local workflows that codes on Promptbook itself](.vscode/terminals.json)
-   Also put Promptbooks own context into AGENTS.md and use it in the Promptbook workdlow itself
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🤒] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🤒] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🤒] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
