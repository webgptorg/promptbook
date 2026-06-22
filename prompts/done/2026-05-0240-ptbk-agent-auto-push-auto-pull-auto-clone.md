[x] ~$0.7457 42 minutes by OpenAI Codex `gpt-5.5`

[✨☢️] The `ptbk agent-folder` should work `--auto-push`, `--auto-pull` and `--auto-clone` options

```bash
ptbk agent-folder run-multiple --agent openai-codex --model gpt-5.5 --thinking-level xhigh --auto-pull --auto-push --auto-clone
```

-   The flags `--auto-pull`, `--auto-push` are relevant for `ptbk agent-folder run-once`, `ptbk agent-folder run-agent` and `ptbk agent-folder run-multiple`
-   The flag `--auto-clone` is relevant `ptbk agent-folder run-multiple`
-   `--auto-clone` is not implemented yet
-   When running `ptbk agent-folder run-multiple` the flags should be relevant for all the repositories which are being watched, and also for the new repositories which are created while `ptbk agent-folder run-multiple` is running
-   When running `ptbk agent-folder run-multiple` the CWD itself can be non-git and just subdirectories can be git repositories which should be watched, pushed, pulled and clonned if new appear
-   The clonning and pulling should be periodical, pushing after message is answered
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.00 37 minutes by OpenAI Codex `gpt-5.5`

[✨☢️] The `ptbk agent-folder` should clone all the repositories with `--auto-clone` options

```bash
ptbk agent-folder run-multiple --agent openai-codex --model gpt-5.5 --thinking-level xhigh --auto-pull --auto-push --auto-clone
```

-   The flag `--auto-clone` is relevant `ptbk agent-folder run-multiple`
-   The flags `--auto-pull`, `--auto-push` are relevant for `ptbk agent-folder run-once`, `ptbk agent-folder run-agent` and `ptbk agent-folder run-multiple`
-   When running `ptbk agent-folder run-multiple` the flags should be relevant for all the repositories which are being watched, and also for the new repositories which are created while `ptbk agent-folder run-multiple` is running
-   When running `ptbk agent-folder run-multiple` the CWD itself can be non-git and just subdirectories can be git repositories which should be watched, pushed, pulled and clonned if new appear
-   The clonning and pulling should be periodical, pushing after message is answered
-   **Now it doesnt clone all the repositories, chack if the clonning is implemented correctly (for example pagination) and fix it if not**
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨☢️] brr

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨☢️] brr

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨☢️] brr

```bash
@@@

npm install ptbk

ptbk agent-folder init

ptbk agent-folder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

