[ ] !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

[✨🎋] Add `--max-priority` and `--min-priority` options to `ptbk coder`

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --min-priority 1 --max-priority 5
```

-   The `--priority` already exist and became alias for `--min-priority`
-   The `--max-priority` is new and should be implemented
-   The coder will use the `--min-priority` and `--max-priority` to filter the tasks that are being processed by the coder
-   Still implement tasks by their priority, but only process the tasks that are within the range of `--min-priority` and `--max-priority`
-   The `--priority` is still available and will be used as `--min-priority`
-   `--min-priority` and `--max-priority` are both optional, if not specified, the coder will process all tasks regardless of their priority
-   `--min-priority` and `--max-priority` can be combined, for example `--min-priority 1 --max-priority 5` will process tasks with priority 1, 2, 3, 4, and 5
-   If only `--min-priority` is bigger than `--max-priority`, the coder should fail with an error message indicating that the range is invalid
-   Both priority values should be integers, and the coder should validate that they are valid integers before proceeding
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json) change `--priority` to `--min-priority` in the dev scripts
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
