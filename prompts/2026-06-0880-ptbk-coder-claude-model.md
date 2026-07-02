[x] $3.17 34 minutes by Claude Code

[✨🔇] The `claude-code` model should be in generated temporarty `sh` script:

```bash
ptbk coder server --harness claude-code --model claude-4.8-opus --thinking-level max --agent agents/coding/developer.book --context AGENTS.md
```

Will not run:

```bash
claude --allowedTools "Bash,Read,Edit,Write" --effort max --output-format json --print <<'CLAUDE_PROMPT'
```

But information about `claude-4.8-opus` is missing

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
    -Study the documentation of `claude` Claude code tool
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

