[x] ~$1.14 2 hours by OpenAI Codex `gpt-5.5`

[✨✴️] Implement `ptbk agents-server start` - the single command to start the Agents Server which will

```bash
npm install ptbk

ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   The `ptbk agents-server start` should internally run _(or do the same logic of leveraging coding agents for answering messages)_ `ptbk agent`
-   The logic is as follows: 0. _(In future)_ The following steps can be wrapped in single `Dockerfile` to self-contain everything and make it easy to run the server
    1. `ptbk agents-server start` is the main command that runs everything, nothing else is needed to start the server, the terminal UI, the web server with API server (already implemented in `apps/agents-server`) and the coding agents with syncing which internally powers the server
    2. It internally runs the Agents server Next.js app which is already implemented in `apps/agents-server`
    3. It internally runs the coding agents which are responsible for answering the messages and running
-   The `ptbk agents-server start` should hbe running with terminal UI by default, but it can also run without terminal UI if `--no-ui`
-   Through this terminal UI, you can see what is happening inside the server, but you cannot interact with this server. You can interact with the web app.
-   But show there important statistics, for example:
    -   the port on which the server is running
    -   the log from the coding agents and from the next app
-   CWD where the `ptbk agents-server start` is started is used to store the agent repositories _(in standard temporary folder)_, the prompts _(in standard temporary folder)_ and also the logs into the folder named `logs` in the CWD, so the logs should be stored in `./logs` folder
-   The `ptbk agents-server start` will be running in read-write file system, the coding runners (like Codex, Github Copilot or Claude code) will be already installed and confugured before the server starts, so the server can use them to run the agents and answer the messages
-   Agent folders
    -   Each agent will have its own folder in the temporary directory, and the coding agents will be running inside these folders answering messages
    -   But unlike `ptbk agent` do not go through the Github repositories and manage it internally, for `ptbk agent` flags `--auto-pull`, `--auto-push` and `--auto-clone` are relevant but for `ptbk agents-server start` these flags are irrelevant, the server should manage everything internally
    -   The source of the truth of the agents is the database, repositories are just a way to run the agents via the coding agents, but the server should manage the repositories internally, the `ptbk agent` does this through external service but the `ptbk agents-server` should do this internally without need to use any external service or git, just watch the message files by the coding agent and reflect them to the Agents server UI / API.
-   The ongoing tasks should be shown both in the Terminal UI and also in the Task Manager in the Web UI.
-   There are three configuration places:

    1. Environment variables
    2. CLI flags
    3. Metadata - keep them as they are

    -   Now some things are in (1) like api keys and some are in (2) like `--agent`, `--model` and `--thinking-level`, they should be interchangeable and everything Which can be set in (1), can also be set in (2), for example `--model` can be set via `PTBK_MODEL` env variable, and `--agent` can be set via `PTBK_AGENT` env variable, and `--thinking-level` can be set via `PTBK_THINKING_LEVEL` env variable, and so on, this way the user can choose if they want to set these things via env variables or via CLI flags, but both should work and override each other in a logical way
    -   Both `--port` and `PORT` env variable should work for setting the port of the server, by default it should be `4440`
    -   The priority should be taking environment variables first, and then CLI flags which override environment variables if set
    -   Metadata should be kept as it is, they are loaded from the database and can be configured via the Agent server admin UI

-   Do a proper analysis of the current functionality before you start implementing, this is an extremely big, structural, and important change, so do a huge due diligence before you start writing any code.
    -   Look at `ptbk start-agents-server` - This is the original idea of running the app via a single command, but it's not working very well.
    -   Look at the [Agents Server](apps/agents-server)
    -   Look how the `ptbk agent` and `ptbk coder` commands are implemented
-   Keep in mind the DRY _(don't repeat yourself)_ principle, especially between `ptbk agent`, `ptbk coder` and `ptbk agents-server`
-   Keep the `ptbk start-agents-server|start` as is, it deprecated later
-   The `ptbk agents-server start` should be the main command to start the Agents Server, when wrapped inside a docker container, it should be the only command to start the server, so it should be working perfectly and without any issues, and it should be able to run the server in a stable way for a long time without crashing or having memory leaks or other issues
-   Responding to the answers can run in parallel for multiple agents.
-   Look and modify [`terminals.json` scripts](.vscode/terminals.json)
-   You are creating [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   For now there will be just `ptbk agents-server start` under `ptbk agents-server` command, but later we can add more commands
-   The agent server was run at Vercel infrastructure. You don't need to keep this backwards compatibility anymore. From now on, the agent server is going to run via the `ptbk agents-server start` command, and it will be the only way to run the server, so you can remove all the old code related to running the server at Vercel infrastructure
-   For now the `ptbk agents-server start` runs in foreground, it can have interactive UI if `--no-ui` flag not set
-   Add the changes into the [changelog](changelog/_current-preversion.md)

