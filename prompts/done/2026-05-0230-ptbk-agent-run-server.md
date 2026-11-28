[x] ~$0.00 36 minutes by GitHub Copilot `gpt-5.4`

[✨🕐] Allow to run `ptbk agent-folder` for multiple agents/repositories at once by one running command

**This should work:**

```bash
$ ls
agent-1/
agent-2/
agent-3/

$ ptbk agent-folder run-multiple --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

It will watch messages in all the subdirectories of CWD

**This should work:**

`ptbk agent-folder tick` -(will be renamed to)-> `ptbk agent-folder run-once`
`ptbk agent-folder run` -(will be renamed to)-> `ptbk agent-folder run-agent`
_(not implemented yet)_ -> `ptbk agent-folder run-multiple`

-   `ptbk agent-folder run-agent` is same as current `ptbk agent-folder run` and will run one agent/repository when runned in its cwd directory
-   `ptbk agent-folder run-once` will do one tick (reply one message) of the agent and then stop
-   `ptbk agent-folder run-multiple` will run all agents in the direct subdirectories of CWD, watch messages and reply to them
    -   Do not work recursively, only direct subdirectories of CWD
-   `ptbk agent-folder run-multiple` will run in single terminal UI, do not run multiple terminal UIs, but show all served agents in one terminal UI, just adapt the terminal UI to show which agent is replying to which message and show the messages,...
-   It shoul also manage new agents by clonning them when they appear on the GitHub organization / owner
-   Clone all the agent repositories with prefix "agent-"
-   For accessing the owner of the repositories to clone them, use `PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN` and `PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER` env variables
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share as much code as possible between `ptbk agent-folder run-once`, `ptbk agent-folder run-agent` and `ptbk agent-folder run-multiple`
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.00 32 minutes by GitHub Copilot `gpt-5.4`

[✨🕐] `ptbk agent-folder run-multiple`should when watching clone the new repositories

-   `ptbk agent-folder run-multiple` is running for multiple agents
-   It can happen situaltion that new agent repository is created while `ptbk agent-folder run-multiple` is running, in this case it should clone the new repository and start watching it without need to restart the whole `ptbk agent-folder run-multiple` or clone it manually
-   The agent repositories are created by Agents server
-   For accessing the owner of the repositories to clone them, use `PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN` and `PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER` env variables
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share as much code as possible between `ptbk agent-folder run-once`, `ptbk agent-folder run-agent` and `ptbk agent-folder run-multiple`
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)

---

[x] ~$1.08 2 hours by OpenAI Codex `gpt-5.5`

[✨🕐] `ptbk agent-folder run-multiple` should clone also the private repositories

-   `ptbk agent-folder run-multiple` is running for multiple agents
-   It can happen situaltion that new agent repository is created while `ptbk agent-folder run-multiple` is running, in this case it should clone the new repository and start watching it without need to restart the whole `ptbk agent-folder run-multiple` or clone it manually
-   The agent repositories are created by Agents server
-   For accessing the owner of the repositories to clone them, use `PROMPTBOOK_AGENT_RUNNER_GITHUB_TOKEN` and `PROMPTBOOK_AGENT_RUNNER_GITHUB_OWNER` env variables
-   Keep in mind the DRY _(don't repeat yourself)_ principle, share as much code as possible between `ptbk agent-folder run-once`, `ptbk agent-folder run-agent` and `ptbk agent-folder run-multiple`
-   Do a proper analysis of the current functionality of `ptbk agent-folder` and related functionality before you start implementing.
-   You are working with [`ptbk agent-folder`](src/cli/cli-commands/agent-folder/run.ts)

---

[-]

[✨🕐] qux

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

[✨🕐] qux

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

