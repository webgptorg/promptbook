[x] by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account) - Implementation ~.73 an hour; Testing 20 minutes

[✨😊] Terminate the underlying harness when the Promptbook coder is terminated.

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md
```

-   Now it sometimes happens that the Promptbook coder is terminated, but the harness is still working in the background, changing files in the background and using the tokens in the background without any control.
-   This is relevant for all harnesses.
-   This is relevant for any reason why the Promptbook coder stops, either because it's being terminated by the user system, it fails to run out of memory, or any other reason.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

