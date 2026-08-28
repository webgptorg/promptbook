[ ]

[✨🛼] qux

```bash
npx ptbk coder run --no-harness-update --harness claude-code --model claude-opus-5 --thinking-level high --agent agents/developer.book --context AGENTS.md --test npm run test-for-ptbk-coder --test-before yes-and-fix --git-changes continue
```

It expects to discover exactly one prompt file in state such as:

```markdown
[^] by Claude Code `claude-opus-5` thinking `high` - Implementation in progress
```

-   @@@@@@@
-   It can happen that one harness started a work and another harness finished it.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](screenshots/2026-08-0670-ptbk-coder-git-changes-continue.png)
