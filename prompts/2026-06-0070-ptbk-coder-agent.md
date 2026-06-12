[x] ~$1.02 2 hours by OpenAI Codex `gpt-5.5`

[✨⛷] Implement `ptbk agent chat` and `ptbk agent exec` commands

```bash
ptbk agent chat --agent ./agents/default/generic-chatter.book --harness openai-codex --model gpt-5.4 --thinking-level xhigh
```

```bash
ptbk agent exec --agent ./agents/default/generic-chatter.book --harness openai-codex --model gpt-5.4 --thinking-level xhigh --context ./context.md --message "Hello"
```

-   The `ptbk agent chat` command will run a interactive CLI chat with an agent
-   The `ptbk agent exec` command will run a single message with an agent and print the response, it will not be interactive
-   The main context should be generated from the agent book, look how `ptbk agents-server` generates the context for the agents and chatting, and do the same for `ptbk agent chat` command
-   Difference between `ptbk agents-server` and `ptbk agent chat` is that `ptbk agents-server` runs entire agents server application with all the features, administration pages, installation process, and other things, while `ptbk agent chat` is just a simple command to run a interactive chat with an agent
-   Allow to pass `--context` which will add extra context into the prompt
-   Keep in mind the DRY _(don't repeat yourself)_ principle, reuse the code between `ptbk agents-server`, `ptbk agent-folder` and `ptbk agent chat` as much as possible, _(for example handling the internal folder for the agent in temporary `.promptbook` directory)_
-   Do a proper analysis of the current functionality of ,`ptbk`, `ptbk agents-server`, `ptbk agent-folder` and `ptbk coder` and related functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛷] baz

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛷] baz

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛷] baz

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

