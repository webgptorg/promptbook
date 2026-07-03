[x] ~$0.00 an hour by GitHub Copilot `gpt-5.4` - not working

---

[x] ~$0.00 an hour by OpenAI Codex `gpt-5.5`

[✨🗿] `ptbk` CLI utility should work globally and without npx

**All of this should work:**

```bash
npm install ptbk

# or

npm install -g ptbk
```

**All of this should work:**

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~/work/dark-factory/aita-stream (main)
$ ptbk --help
/usr/bin/ptbk: line 1: ts-node: command not found

me@DESKTOP-2QD9KQQ MINGW64 ~/work/dark-factory/aita-stream (main)
$ npx ptbk --help
Usage: promptbook|ptbk [options] [command]

Create persistent AI agents that turn your company's scattered knowledge into action

Options:
  -V, --version                               output the version number
  -h, --help                                  display help for command

Commands:
```

-   The `ptbk --help` (without npx) is currently not working
-   Global installation of `ptbk` CLI utility is currently not working
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk` and related functionality before you start implementing.
-   You are working with [`ptbk` CLI utility](src/cli/cli-commands/)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🗿] bar

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🗿] bar

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🗿] bar

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

