```bash
@@@

npm install ptbk

ptbk agent init

ptbk agent run-multiple --agent openai-codex --model gpt-5.5 --thinking-level xhigh --auto-pull --auto-push --auto-clone
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
