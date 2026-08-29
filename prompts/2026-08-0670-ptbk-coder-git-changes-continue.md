[ ]

[✨🛼] Allow to pick what happen with dirty working dir in coder

```bash
npx ptbk coder run --no-harness-update --harness claude-code --model claude-opus-5 --thinking-level high --agent agents/developer.book --context AGENTS.md --test npm run test-for-ptbk-coder --test-before yes-and-fix --git-changes continue
```

It expects to discover exactly one prompt file in state such as:

```markdown
[^] by Claude Code `claude-opus-5` thinking `high` - Implementation in progress
```

And this will continue the interrupted work.

-   When the continue option does not find any changes or finds multiple prompts with `[^]` fail.
-   It can happen that one harness started a work and another harness finished it.
    -   Record this information correctly in `[^]`, `[x]` and `[!]`
-   There should be effectively new option `--git-changes` that can be set to `fail`, `ignore` or `continue`
-   By default it should be set to `fail` and if there are any git changes, the command should fail with an error message that there are git changes and that the user should either commit them or use `--git-changes ignore` or `--git-changes continue`
-   Also change the deprecated option `--ignore-git-changes` to `--git-changes ignore`
    -   Do not keep the backward compatibility with `--ignore-git-changes` just change the usege to `--git-changes ignore` and remove the `--ignore-git-changes` option from the code and the help
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](screenshots/2026-08-0670-ptbk-coder-git-changes-continue.png)
