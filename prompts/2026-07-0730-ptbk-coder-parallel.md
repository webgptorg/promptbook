[ ]

[✨⚜️] Add `--parallel` option to promptbook coder

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --isolate --parallel 3
```

-   @@@ wait to isolate is working
- When using Parallel, it will create multiple worktrees, and each worktree will have its own isolated environment.
- After the task is Implemented and verified, automatically merge into the original branch from where the coder is running, and delete the worktree
- If the merge fails, instead of `[x]` the task do `[!]` and into the original worktree commit just information  that merge failed, and the user should manually merge the changes from the worktree into the original branch and delete the worktree manually. Do not delete the worktree in this case. Do not terminate the coder, just continue with the next task.
- These temporary worktrees will have branches `ptbk-coder-isolation/<task-name>` and will be deleted after the task is completed and merged into the original branch. If the merge fails, the worktree will not be deleted, and the user should manually merge the changes from the worktree into the original branch and delete the worktree manually.
- By default the `--parallel` option is set to 1, which means that the code will be executed sequentially. If you want to run multiple instances of the code in parallel, you can set the `--parallel` option to a higher number. For example, if you set `--parallel 3`, it will run three instances of the code in parallel.
- When using the `--parallel` option, you must also use the `--isolate` option, which will isolate the instances of the code from each other. This means that each instance will have its own environment and will not interfere with the other instances. When using the `--parallel` with higher number of instances and not using the `--isolate` option, it will fail
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    - Especially share the code between `--isolate` and `--parallel` options, as they are related.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
