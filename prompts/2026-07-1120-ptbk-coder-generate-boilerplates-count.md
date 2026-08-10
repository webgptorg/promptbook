[x] by Claude Code `opus` thinking `max` - Implementation $8.53 28 minutes; Testing 25 minutes

[✨🔩] When generating boilerplates, allow specifying not only the count of the generated prompt files but also how many prompts will be in each file.

```bash
ptbk coder generate-boilerplates --count 10*7 --template prompts/_templates/common.md
```

-   Allow both notations `--count 5*1` and `--count 5`, when there is just one number, it is considered as `--count N*1` and when there are two numbers, it is considered as `--count N*M`
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json) and the boilerplate creation scripts set to `--count 5*1`
-   The `ptbk init` should also create a boilerplate creation script with `--count 5*1` and the `ptbk coder generate-boilerplates` command should have `--count 5*1` as the default value for `--count` option
-   More then one prompt in a single prompt file should be considered an advanced option And on the coder landing page, should be considered and listed as an advanced option
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account) - Implementation ~$0.2924 31 minutes; Testing 16 minutes

[✨🔩] When generating boilerplates and there are multiple prompts in one prompt file, they all should have the same emoji tag.

```bash
ptbk coder generate-boilerplates --count 10*7 --template prompts/_templates/common.md
```

-   Each prompt file should have the same emojis in all of their prompts.
-   But for every prompt file, there should be a unique emoji.
-   So, for example, the `--count 10*7` will generate 10 prompt files, each with 7 prompts, and each prompt file will have a unique emoji tag, but all 7 prompts in that file will have the same emoji tag, so in total there will be 10 unique emoji tags, one for each prompt file.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

