[ ]

[✨𓀀] The `npx ptbk`, `npm i ptbk && ptbk` and `npm i -D ptbk && ptbk` works differently, fix it

*(@@@ Study beforehand how NPM and NPX works, how it finds the binaries)*

```bash
hejny@Pavols-MacBook-Air test1 % ptbk about
Promptbook: Create persistent AI agents that turn your company's scattered knowledge into action
Book language version: 2.0.0
Promptbook engine version: 0.112.0-119
Environment: Node.js
Node.js version: v24.17.0
Platform type: darwin
Platform architecture: arm64
https://github.com/webgptorg/promptbook
https://ptbk.io
hejny@Pavols-MacBook-Air test1 % npx ptbk about
Promptbook: Create persistent AI agents that turn your company's scattered knowledge into action
Book language version: 2.0.0
Promptbook engine version: 0.113.0-1
Environment: Node.js
Node.js version: v24.17.0
Platform type: darwin
Platform architecture: arm64
https://github.com/webgptorg/promptbook
https://ptbk.io
hejny@Pavols-MacBook-Air test1 % npx ptbk about
```

-   It should be the same version of `ptbk` when you run it with `npx ptbk`, `npm i ptbk && ptbk` and `npm i -D ptbk && ptbk`
-   On all platforms (macOS, Windows, Linux)
-   When ptbk installed, it should be added the current installed version to path
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk`, `@promptbook/cli`, adding to path and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk`](src/cli/cli-commands/)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
