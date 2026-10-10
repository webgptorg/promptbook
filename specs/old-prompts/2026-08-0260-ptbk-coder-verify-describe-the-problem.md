[ ]

[✨📖] When "❌ No, needs work" selected, Interactively ask what needs to be done. 

```bash
ptbk coder verify


...


    -   When `ptbk coder run` is run, it should commit only the prompt file and the file cha…
? Is prompts/2026-08-0180-ptbk-coder-commit-only-relevant-files.md#1 actually done? › - Use arrow-keys. Return to submit.
    ✅ Yes, it's done
❯   ❌ No, needs work
    ⏩ Skip, do nothing
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)