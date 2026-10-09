[x] by Promptbook Developer on OpenAI Codex `gpt-6.1-sol` thinking `max` (ChatGPT account) - Implementation ~$0.3084 14 minutes; Checking in progress

[✨🦫] Lock files of Promptbook coder should be in folder `.promptbook`

```bash
ptbk coder run ...
```

-   Now they are for some reason saved in `.git` folder
-   This should never ever happen. PROMPTBOOK SHOULD NEVER TOUCH the `.git` folder.
-   Use already existing temporary folder `.promptbook/ptbk-coder`
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Fix it also in the [changelog](changelog/_current-preversion.md)


