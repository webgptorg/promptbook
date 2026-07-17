[ ]

[✨🚭] Allow to specify required model for each prompt

**For example when you run:**

```bash
ptbk coder run --harness github-copilot --model gpt-5.5 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md
```

**This prompt will run:**

```markdown
[ ] use `gpt-5.5`

[✨𓀍] Do some work
```

**This prompt will also run:**

```markdown
[ ] use model `gpt-5.5`

[✨𓀍] Do some work
```

**This prompt will also run:**

```markdown
[ ] !!!! gpt

[✨𓀍] Do some work
```

**This prompt will also run:**

```markdown
[ ] use `github-copilot` !!!!!

[✨𓀍] Do some work
```

**But this will be ignored:**

```markdown
[ ] use `claude-opus`

[✨𓀍] Do some work
```

use fable
use gpt 5.6

either model or harness name
normalized

-   @@@
- In the `[ ]` section of the prompt to be done allowed to specify the required model or harness for this prompt
- Allow to combine the model / harness name in the `[ ]` section with the priority !!!!!
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
