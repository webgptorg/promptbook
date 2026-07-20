[x] $8.01 6 hours by Claude Code `claude-opus-4-8`

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
[ ] !!!! `gpt`

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


- In the `[ ]` section of the prompt to be done allowed to specify the required model or harness for this prompt
- Allow to combine the model / harness name in the `[ ]` section with the priority !!!!!
-  you can specify either model or harness or just family of the models. For example: 
    - `gpt` - any model from the gpt family
    - `github-copilot` - the harness
    - `claude` - any model from the claude family
    - `claude-opus` - any model from the claude-opus family
    - `opus` - any model from the claude-opus family
    -  this shouldn't be hardcoded. The matching from the prompt and the harness or model name should be done dynamically via normalized names
    - the normalized name of the model or harness is computed from the name of the model or harness by removing all non-alphanumeric characters and lowercasing it. For example: 
        - `gpt-5.5` -> `gpt-5-5`
        - `claude-opus-4.8` -> `claude-opus-4-8`
        - `github-copilot` -> `github-copilot`
        - `claude-opus` -> `claude-opus`
        - `claude` -> `claude`
        -  Use the normalizing functions which are here in the project,  do not implement your own normalizing function 
-  the strategy should work as follows: it should firstly take all the tokens in these `parentheses` in the prompt line 
    - For example: "[ ] use `gpt-5.5`" -> it should take the token `gpt-5.5`
- Then it should normalize the name of the model or harness which is used to run this prompt. For example: `gpt-5.5` -> `gpt-5-5`
- Then it should normalize the name of the model and harness which is used to run the ptbk coder
- Then match all the tokens from the prompt with the normalized name of the model or harness which is used to run this prompt. If any of the tokens matches, then this prompt can be run. If none of the tokens matches, then this prompt should be skipped and not run.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

