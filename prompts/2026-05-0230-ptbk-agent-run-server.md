[x] ~$0.00 36 minutes by GitHub Copilot `gpt-5.4`

[✨🕐] Allow to run `ptbk agent` for multiple agents/repositories at once by one running command

**This should work:**

```bash
$ ls
agent-1/
agent-2/
agent-3/

$ ptbk agent run-multiple --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

It will watch messages in all the subdirectories of CWD

**This should work:**

`ptbk agent tick` -(will be renamed to)-> `ptbk agent run-once`
`ptbk agent run` -(will be renamed to)-> `ptbk agent run-agent`
_(not implemented yet)_ -> `ptbk agent run-multiple`

-   `ptbk agent run-agent` is same as current `ptbk agent run` and will run one agent/repository when runned in its cwd directory
-   `ptbk agent run-once` will do one tick (reply one message) of the agent and then stop
-   `ptbk agent run-multiple` will run all agents in the direct subdirectories of CWD, watch messages and reply to them
    -   Do not work recursively, only direct subdirectories of CWD
-   `ptbk agent run-multiple` will run in single terminal UI, do not run multiple terminal UIs, but show all served agents in one terminal UI, just adapt the terminal UI to show which agent is replying to which message and show the messages,...
-   It shoul also manage new agents by clonning them when they appear on the GitHub organization / owner
-   Clone all the agent repositories with prefix "agent-"
-   For accessing the owner of the repositories to clone them, use `PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN` and `PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER` env variables
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share as much code as possible between `ptbk agent run-once`, `ptbk agent run-agent` and `ptbk agent run-multiple`
-   Do a proper analysis of the current functionality of `ptbk agent` and related functionality before you start implementing.
-   You are working with [`ptbk agent`](src/cli/cli-commands/agent/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🕐] qux

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

[✨🕐] qux

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

[✨🕐] qux

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

