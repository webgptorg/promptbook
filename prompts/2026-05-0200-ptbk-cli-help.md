[ ] !

[✨📽] The `npx ptbk` _(without any arguments)_ command should work exactly as `npx ptbk --help`

**Now it works:**

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~/work/dark-factory/aita-stream (main)
$ npx ptbk
Cannot read properties of undefined (reading 'includes')

me@DESKTOP-2QD9KQQ MINGW64 ~/work/dark-factory/aita-stream (main)
$ npx ptbk --help
Usage: promptbook|ptbk [options] [command]

Create persistent AI agents that turn your company's scattered knowledge into action

Options:
  -V, --version                               output the version number
  -h, --help                                  display help for command

Commands:
...
```

**It should work:**

```bash
$ npx ptbk
Usage: promptbook|ptbk [options] [command]

Create persistent AI agents that turn your company's scattered knowledge into action

Options:
  -V, --version                               output the version number
  -h, --help                                  display help for command

Commands:
...
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk` and related functionality before you start implementing.
-   You are working with [`ptbk` CLI utility](src/cli/cli-commands/)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📽] foo

```bash
@@@

npm install ptbk

ptbk agent init

ptbk agent run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📽] foo

```bash
@@@

npm install ptbk

ptbk agent init

ptbk agent run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📽] foo

```bash
@@@

npm install ptbk

ptbk agent init

ptbk agent run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
