[ ]

[✨🤲] Do not run `generate-boilerplates` during `ptbk coder init` if `prompts/` already contains real prompts

`ptbk coder init` silently runs `generate-boilerplates` and creates 5 placeholder prompts even when `prompts/` already contains real prompts

```bash
ptbk coder init
```

**Version:** `ptbk` 0.114.0-26

Running `ptbk coder init` in a repository that already had 15 hand-written prompt files also created `2026-09-0160-foo.md`, `0170-bar.md`, `0180-baz.md`, `0190-qux.md`, `0200-brr.md` (all `[-]` with `@@@`). Nothing in the init description mentions boilerplate generation, and the numbering continued after the existing prompts, so it clearly saw them.

**Expected**: skip boilerplate generation when `prompts/` is non-empty, or ask first.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if necessary.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
