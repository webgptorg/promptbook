[ ] `astra`

[✨🍟] The Promptbook coder agents should resolve `FROM` correctly.

```bash
ptbk coder run --harness openai-codex --model gpt-5.6-astra --thinking-level max --agent agents/coding/pavol-workshops.book --context AGENTS.md
```

**When there are multiple books:**

```
pavol-workshops.book
pavol.book
```

**And one of them is specified in the `FROM` clause:**

```
FROM @Pavol
```

It should read all the agents and resolve the `FROM` commitments correctly.

-   Same thing applies to `IMPORT` and `TEAM` commitments
-   All of theese should work:
    -   `FROM @Pavol`, `FROM {Pavol}` - The "Pavol" Is the name of the agent from the first line of its book source
        -   This book should be auto-finded in the repository, go recursively from the folder where the primary agent lives, in this case `agents/coding/pavol-workshops.book` - so folder `agents/coding/` will be searched.
    -   `FROM {./foo/bar/agent.book}`, `FROM {../foo/bar/agent.book}` - The path to the agent book is relative to the agent
    -   `FROM {foo/agent.book}` - The path relative to the cwd (current working directory)
    -   `FROM {http://example.com/agent.book}` - The path to the agent book can also be a URL
    -   `FROM @null`, `FROM {null}`, `FROM {void}`, `FROM @void` - Agent which event dont inherit from Adam agent
-   The agents are auto-inherited from Adam agent by default, if the Adam agent not existing, auto-create it in `.core` folder, in this case in `agents/coding/.core/adam.book`
    -   Simmilar logic is in the agent server code, just reuse the same code for the same logic and patterns
    -   Also `ptbk init` should auto-create the Adam agent in the `.core` folder together with `developer.book` which is already doing
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   Same logic is working on the agent server. Reuse the same code for the same logic.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if there are any changes that affect the landing page.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

@@@ Adam
