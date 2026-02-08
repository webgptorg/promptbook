[x]

[✨🎮] Allow to specify model in coding agent when using `--agent openai-codex`

-   Now the coding agent is always using default model when you run `--agent openai-codex`. It would be good to allow users to specify the model as well, for example `--agent openai-codex --model gpt-5.2-codex` or `--agent openai-codex --model gpt-4-codex`.
-   Do not hardcode the models, allow to specify any model that is supported by the OpenAI Codex runner.
-   If the model is not specified, show the error message with which models are available.
-   Allow to say `--agent openai-codex --model default` - that will have same behavior as now, using the default model.
-   Add the model information into the checked prompt:
    -   "[ ] !!" -> "[x] ~$0.59 by OpenAI Codex `gpt-5.2-codex`"
-   Other runners shouldnt be affected, only the Open AI Codex coding runner.
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🎮] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🎮] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🎮] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
