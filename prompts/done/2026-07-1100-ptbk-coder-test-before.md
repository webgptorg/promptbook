[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation ~$0.4802 17 minutes; Testing 26 minutes

[✨🛀] Add `--test-before` option to `ptbk coder run`

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --test-before yes-and-fix
```

-   Purpose of this is to do the testing before the agent coding even starts to avoid the situation when some new feature is implemented. The error occurs, but the agent has no clue if the error has some connection with the new code or it was already there.
-   `--test-before no` (Current behavior and the default one), `--test-before yes-and-fail` and `--test-before yes-and-fix`
-   The `--test-before yes-and-fail` should run the tests before the agent coding starts and if there is any error, it should fail and not start the agent coding. It should show the error and the test results.
-   The `--test-before yes-and-fix` should run the tests before the agent coding starts and if there is any error, it should create one prompt for the agent to fix the error and then continue with the agent coding.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, reuse existing code for prompt creation especially with the `ptbk coder generate-boilerplates` and `ptbk coder add` commands
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json) and use `ptbk coder run --test-before yes-and-fix` in the dev scripts
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.5485 27 minutes; Testing 28 minutes

[✨🛀] Chamge confusing screen when `--test-before` option is used

-   When the initial test phase is happening, it is a bit confusing because there is 0/0 tasks in queue and the user does not know what is happening
-   Load the tasks and show some message like "Running initial tests before the agent coding starts" and show the progress of the tests.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts) with options `--test-before yes-and-fail` and `--test-before yes-and-fix`
-   Update the [`ptbk coder` landing website](apps/coder-landing) if relevant

