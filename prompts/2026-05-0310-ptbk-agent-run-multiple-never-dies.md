[ ] !

[✨🚪] Script `ptbk agent run-multiple` should be running indefinetly when started

```bash
ptbk agent run-multiple --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   The `ptbk agent run-agent` and `ptbk agent run-multiple` should be running indefinetly when started, it should not stop after some time or at idle
-   It should be prepared to run when the message arrives, it can wait long time until the message arrives, and it should not stop or exit in the meantime
-   On the other hand `ptbk agent run-once` should stop after the message is answered, it is designed to run only once and then stop, so it should not be running indefinetly like `ptbk agent run-agent` and `ptbk agent run-multiple`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚪] bar

```bash
@@@

npm install ptbk

ptbk agent init

ptbk agent run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚪] bar

```bash
@@@

npm install ptbk

ptbk agent init

ptbk agent run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚪] bar

```bash
@@@

npm install ptbk

ptbk agent init

ptbk agent run --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
