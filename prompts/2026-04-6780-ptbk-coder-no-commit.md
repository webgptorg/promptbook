[ ] !!!

[✨🈲] Add flag `--no-commit` to `ptbk coder run`

```bash
ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --no-commit
```

-   This will run the coder agent but it will not commit the changes to git and just leave the changes in the working directory
-   When this flag is used together with `--no-wait` but without `--ignore-git-changes` it should fail - because the agent will not be able to commit the changes and it will detect that there are uncommited changes in the git repository on the next prompt and it will fail
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🈲] foo

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

[✨🈲] foo

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

[✨🈲] foo

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
