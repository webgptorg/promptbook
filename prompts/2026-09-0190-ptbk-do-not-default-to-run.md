[x] by Claude Code `claude-opus-5` thinking `max` - Implementation $4.32 21 minutes; Testing 17 minutes

[✨🥍] The `ptbk` CLI should not default to `ptbk run` which is deprecated

```bash
ptbk
```

-   When running `ptbk` without any subcommand, it should not default to `ptbk run` since it is deprecated.
-   It should instead display the help message or prompt the user to specify a subcommand.
-   The `ptbk coder` should be first command among the listed subcommands.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk` and related functionality before you start implementing.
-   You are working with [`ptbk`](src/cli/cli-commands/)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

