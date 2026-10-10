[!] failed after an hour by Claude Code `claude-opus-4-8`

[✨♌️] Promptbook coder should report usage, show the usage for each step separately, not just the total usage for the whole task.


**Change this:**

```bash
[x] $8.01 6 hours by Claude Code `claude-opus-4-8`
```

**To this:**

```bash
[x] by Claude Code `claude-opus-4-8` - Implementation $8.01 6 hours; Testing 1 hour
```


**Or this:**


```bash
[x] by Claude Code `claude-opus-4-8` - Implementation $8.01 6 hours; Testing 1 hour; Fixing $3.14 2 hours; Testing 1 hour; Fixing 1 hour
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

