[ ]

[✨🐖] Show better estimates for `ptbk coder run` and `ptbk coder server`

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   The estimates should be shown in 24h format - for example "17:30" not "5:30"
-   Use the temporary folder cache to store the estimates for the next runs, so that the estimates are not lost when the process ends
-   Uniquely identify the estimates for each combination of `--harness`, `--model`, `--thinking-level` and store them separately, so that the estimates are not mixed up between different runs
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐖] baz

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐖] baz

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🐖] baz

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
