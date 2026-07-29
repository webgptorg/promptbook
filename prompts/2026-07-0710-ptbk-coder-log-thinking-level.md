[ ]

[✨🛄] Log the thinking level in Promptbook coder

**Change this:**

```markdown
[x] by Claude Code `claude-opus-4-8` - Implementation $14.90 3 hours; Testing 28 minutes
```


**To this:**

```markdown
[x] by Claude Code `claude-opus-4-8` thinking `xhigh` - Implementation $14.90 3 hours; Testing 28 minutes
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
