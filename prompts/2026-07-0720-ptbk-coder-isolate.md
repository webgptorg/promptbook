[ ]

[✨🛐] Add `--isolate` option to promptbook coder

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --isolate
```

- When using isolate, it will create a temporary worktree, the worktree will have its own isolated environment.
- Temporary WorkTree folder should be inside the temporary folder of the Promptbook coder @@@@@@@@@@
- After the task is implemented and verified, automatically merge into the original branch from where the coder is running, and delete the worktree
- If the merge fails, instead of `[x]` the task do `[!]` and into the original worktree commit just information  that merge failed, and the user should manually merge the changes from the worktree into the original branch and delete the worktree manually. Do not delete the worktree in this case. Do not terminate the coder, just continue with the next task.
- These temporary worktrees will have branches `ptbk-coder-isolation/<task-name>` and will be deleted after the task is completed and merged into the original branch. If the merge fails, the worktree will not be deleted, and the user should manually merge the changes from the worktree into the original branch and delete the worktree manually.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
