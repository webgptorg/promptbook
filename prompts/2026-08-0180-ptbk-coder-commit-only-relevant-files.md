[ ]

[✨💝] When Promptbook Coder is committing, commit only relevant files for the current operation. 

```bash
ptbk coder verify --commit

ptbk coder add --commit

ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md
```

-   Now the Promptbook coder is committing all the files which are changed. 
-   It should commit only the files which are relevant for the current operation. For example:
    -   When `ptbk coder verify` is run, it should commit only the moved / modified prompt file
    -   When `ptbk coder add` is run, it should commit only the added prompt file
    -   When `ptbk coder run` is run, it should commit only the prompt file and the file changed by the agent
    -   ...
-  Verify this pattern for all scripts which are commiting in the `ptbk coder` and make sure they are commiting only the relevant files for the current operation.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
