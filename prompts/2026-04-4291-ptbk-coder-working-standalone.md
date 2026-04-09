[ ]

[✨👜] `ptbk coder` must work standalone in external project

```bash

## On external project as dependency
$ npm install ptbk
$ ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --no-wait
/usr/bin/ptbk: line 1: ts-node: command not found

$ ptbk --help
/usr/bin/ptbk: line 1: ts-node: command not found
```

-   (probbably) The `ts-node` dependency is not installed in external project and it should not be, because its a dev dependency of Promptbook itself, look at the build process of `@promptbook/cli`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Also update [`terminals.json` file with local workflows that codes on Promptbook itself](.vscode/terminals.json)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨👜] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨👜] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨👜] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
