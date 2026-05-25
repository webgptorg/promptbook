[x] ~$0.2174 44 minutes by OpenAI Codex `gpt-5.5`

[✨👽] Deprecate some commands of `ptbk` CLI utility

**Commands:**

-   `about` - Keep as is
-   ` run|execute`` - This is part of the old pipeline system. Deprecate it `
-   `login` - This is part of the old pipeline system. Deprecate it
-   `hello|hi` - Keep as is
-   `make|compile` - This is part of the old pipeline system. Deprecate it
-   `prettify ` - This is part of the old pipeline system. Deprecate it
-   `test` - This is part of the old pipeline system. Deprecate it
-   `list-models|models` - This is part of the old system. Deprecate it
-   `list-scrapers|scrapers` - This is part of the old system. Deprecate it
-   `start-agents-server|start` - This is now implemented as `ptbk agents-server start`, so the old command should be deprecated
-   `start-pipelines-server` - This is part of the old pipeline system. Deprecate it
-   `agent` - Keep as is
-   `coder` - Keep as is
-   `help` - Keep as is

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk` and related functionality before you start implementing.
-   Look and cleanup [`terminals.json` scripts](.vscode/terminals.json) from deprecated commands and scripts - they should not be there if the commands are deprecated
-   You are working with [`ptbk` CLI utility](src/cli/)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ] !

[✨👽] Change `ptbk agent` to `ptbk agent-folder`

-   You do not need to keep backwards compatibility with the old command, you just rename the command
-   Rename both the implementation and usage across the codebase
    -   Do fulltext search for `ptbk agent` and replace it with `ptbk agent-folder` across the codebase, including documentation, comments, tests, etc.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨👽] brr

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

[✨👽] brr

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
