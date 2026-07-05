[ ] !

[✨🧏] Add `--limit` to `ptbk coder find-refactor-candidates` 

```bash
ptbk coder coder find-refactor-candidates --level low --limit 10
```

-   Limit will create maximum number of candidates to refactor. If there are more candidates create only most important ones. If there are less candidates than the limit, it will create all of them.
- It can be combined with `--level` to limit the number of candidates for a specific level.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder find-refactor-candidates` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
