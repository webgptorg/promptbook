[x] ~$1.95 an hour by OpenAI Codex `gpt-5.5`

[✨🗜] Add `--ignore <pattern>` flag to `ptbk agent run-multiple`

```bash
ptbk agent run-multiple --agent github-copilot --model gpt-5.4 --thinking-level xhigh --ignore "John*"
ptbk agent run-multiple --agent github-copilot --model gpt-5.4 --thinking-level xhigh --ignore John*
```

-   The `--ignore <pattern>` flag allows users to specify a pattern to ignore certain agents when running `ptbk agent run-multiple`. In the example above, any agent repository that starts with "John" will be ignored and not cloned or watched by `ptbk agent run-multiple`.
-   Ignore is case insensitive and supports `*` wildcard, so `--ignore "John*"` will ignore repositories like "John", "john-doe", "JohnSmith", etc.
-   Check both agent name, normalized agent name and agent ID, when any of them matches the ignore pattern, ignore that agent
-   Do not show theese agents in "Agents" box but show number of ignored agents in "Session"
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🗜] foo

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

[✨🗜] foo

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

[✨🗜] foo

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

