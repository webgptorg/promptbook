[ ] !!

[✨🏨] Add flag `--preserve-logs` into `ptbk coder run`

```bash
ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --preserve-logs
```

**Theese files are created during the run:**

```
2026-04-6450-...-1.sh <- The file which should be conditionally preserved if the flag is present
2026-04-6450-...-1.test.sh <- Already existing
2026-04-6450-....md <- The file which should be conditionally preserved if the flag is present
2026-04-6450-....-1.log.txt <- The file which should be conditionally preserved if the flag is present
```

-   The `--preserve-logs` flag should preserve the generated logs and prompt files after the run, which is useful for debugging and testing purposes, and also for keeping a history of the runs, which can be useful for analytics and other purposes
-   Theese should be standartly commited into git when the task finishes (as all other files in cwd)
-   By default theese files should be deleted after the run is finished _(current behaviour)_
-   Preserve theese files only if the flag is present or the task fails, otherwise delete them
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🏨] foo

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🏨] foo

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🏨] foo

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
