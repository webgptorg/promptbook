[x] (2 attempts) ~$0.3446 3 hours by OpenAI Codex `gpt-5.5` (ChatGPT account)

[✨😼] Add controls

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md
```

The controls should be:

```
 P  Pause  S  Skip current waiting  X  End with this prompt   CTRL+C  Exit
```

-   Add two controls - S and X
-   The S control will skip the current waiting (either waiting between prompts, after prompts or error) and just continue
-   When the S is pressed act just as if that particular waiting is skipped and continue whatever will happen next (either retry, error, next prompt, etc)
-   The X control will do nothing immediately, but will end the coder after the current prompt is finished (either success or error)
    -   Its effectively like making `--limit 1` on the fly
-   The X is toggable, you can press X again to cancel the end and continue as normal
-   For X reuse the behaviour of P which is also toggable
-   Just X have only 2 states - `X  End with this prompt` and `X  Do all 11 prompts`
    -   11 is just an example, it should be the total number of prompts in the current run
-   This is relevant for both `ptbk coder run` and `ptbk coder server`
-   These controls are added alongside ` P  Pause` on the `Controls` section of terminal UI
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

