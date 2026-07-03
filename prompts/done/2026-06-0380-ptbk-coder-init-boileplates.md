[x] $0.2542 25 minutes by Claude Code

[✨😎] When running `ptbk coder init` automatically run creation of boilerplates

```bash
ptbk coder init
```

-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)

---

[x] $2.82 31 minutes by Claude Code

[✨😎] When running `ptbk coder init` automatically run creation of boilerplates and create a simple agent

**After:**

```bash
ptbk coder init
```

**`coder:run` should look like:**

`ptbk coder run --harness openai-codex --model gpt-5.5 --thinking-level xhigh --agent agents/developer.book --context AGENTS.md`

-   Immediately after running `ptbk coder init`, the `agents/developer.book` should be created and the running boilerplate script should be initially executed
-   The file `agents/developer.book` should be copied from `agents/default/developer.book`
-   Be aware that:
    1. `agents/default/developer.book` - Is file in this repository
    2. `agents/developer.book` - Is file in the consumer project where `ptbk coder init` is run
    -   There should be some mechanism that relyably provides access to the `agents/default/developer.book` from the `@promptbook/cli` package, so that it can be used in the consumer project
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)

