[x] $10.57 an hour by Claude Code `claude-opus-4-8`

[✨🪴] Create command `ptbk coder add`

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

-   This command will add the new prompt file with one prompt
- Find unique emoji tag for this prompt, for example `[✨🪴]`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, reuse existing code especially with the `ptbk coder generate-boilerplates` command
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Create one script with interactive add in [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
- Add `coder:add` when initializing the Promptbook coder
-   Add the changes into the [changelog](changelog/_current-preversion.md)

