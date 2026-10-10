[x] ~$0.4011 an hour by OpenAI Codex `gpt-5.5`

[✨🍑] The waiting in ptbk coder should elapse during pause or when computer is on sleep

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --wait-between-prompts 1h
```

-   Now the waiting time is not progressing when the computer is on sleep or when the user pauses the execution of the `ptbk coder` via "P" button. It should elapse during pause or when computer is on sleep.
- The waiting time should be relative to the world time, not the computer time. So if the user pauses the execution for 1 hour, the waiting time should elapse by 1 hour. If the computer is on sleep for 1 hour, the waiting time should elapse by 1 hour. In this situation, the waiting time is effectively over
- This is relevant for all the aftifitial waiting in ptbk coder, not only for the `--wait-between-prompts` option.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

