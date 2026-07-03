[ ]

[✨⚅] bar

```bash
npx ts-node ./src/cli/test/ptbk.ts coder generate-boilerplates --count 5 --template prompts/_templates/agents-server.md
hejny@Pavols-MacBook-Air promptbook % npx ts-node ./src/cli/test/ptbk.ts coder generate-bo
ilerplates --count 5 --template prompts/_templates/agents-server.md
🚀  Generate prompt boilerplate files
Highest existing number for 2026-07 found: 0000
Found 537 available fresh emojis
Selected emojis: [✨🛢] [✨🥛] [✨🚝] [✨⚓️] [✨🎸]
Creating 5 files:
✓ Created: 2026-07-0000-agents-server-foo.md with [✨🛢]
✓ Created: 2026-07-0010-agents-server-bar.md with [✨🥛]
✓ Created: 2026-07-0020-agents-server-baz.md with [✨🚝]
✓ Created: 2026-07-0030-agents-server-qux.md with [✨⚓️]
✓ Created: 2026-07-0040-agents-server-brr.md with [✨🎸]
 Successfully created 5 prompt boilerplate files! 
hejny@Pavols-MacBook-Air promptbook % npx ts-node ./src/cli/test/ptbk.ts coder generate-boilerplates --count 5 --template prompts/_templates/agents-server.md


```

-   @@@@@@@@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
