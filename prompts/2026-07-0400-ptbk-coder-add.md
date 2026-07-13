[ ]

[✨🪴] bar

```bash
# Simple
ptbk coder add "some new feature"

# With priority
ptbk coder add --priority 1 "some new feature"

# Multiline
ptbk coder add <<EOF
This is a multiline description of the new feature.
It can include details, examples, and any other relevant information.
EOF

# Interactive
ptbk coder add
```

-   @@@@@@@@@@@@@@@@@@@@@@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
