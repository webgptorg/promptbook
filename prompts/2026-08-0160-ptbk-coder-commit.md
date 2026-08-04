[x] by Claude Code `opus` thinking `max` - Implementation 0.70 3 hours; Testing 21 minutes

[✨🌫] Add `--commit` option to `ptbk coder` commands

```bash
ptbk coder init --commit
```

-   Add `--commit` option to _(and also `--auto-push` and `--auto-pull` options)_ to the `ptbk coder generate-boilerplates`, `ptbk coder add`, `ptbk coder verify` and `ptbk coder init` commands
-   This will automatically pull the changes if `--auto-pull` is specified and push them to the remote repository if `--auto-push` is specified
-   `ptbk coder verify` should do it after each verification -`ptbk coder run` and `ptbk coder server` should stay intact
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   The committing, pushing and pulling logic should be implemented in a single place and reused in all commands that need this functionality
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json), the boilerplate generation scripts should have `--commit` option and also `--auto-push` and `--auto-pull` options
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

