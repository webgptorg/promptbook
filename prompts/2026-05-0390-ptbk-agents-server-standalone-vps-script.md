[x] ~$1.37 2 hours by OpenAI Codex `gpt-5.5`

[✨🤬] Allow to install Agents server in single standalone VPS server by one command

-   Make it to `other/vps/install.sh`
-   When you run this script on a fresh VPS server, it should install all the necessary dependencies and start the Agents server with the command above.
    -   It should be enough to pass something like this into the bash of the fresh VPS `curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash` and everything should be set up and the server should be running after that.
    -   By running the server I mean running `ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh` in some deamonized way, so it will be running even after the user disconnects from the server.
    -   It should install everything needed for the server to run, including Node.js, Promptbook itself, let the user to sign in to Github copilot coding agent (or other code runner), and all the necessary configuration should be done by the script as well.
    -   The installation script can be interactive, it can ask user to input some values if needed, for example to choose the code runner and input the credentials for it.
    -   The installation script should be 100% standalone, it should not require any additional configuration or setup from the user, it should do everything from fresh VPS server to running Agents server
    -   The installation script must be idempotent, so if the user runs it multiple times, it should not break anything and should just make sure that everything is installed and running.
    -   The agent server should be configured in a `pm2` process manager and automatically set up to start on server boot.
    -   The installation script can require sudo permissions, but it if does, it should ask for them in the beginning and explain why they are needed.
-   The installation script should work for Ubuntu 24.04 LTS x64 _(on DigitalOcean, AWS, or any other VPS provider)_
-   Now the server requires Supabase which is configured in environment variables. But for standalone server we should use standalone solution, allow the Agents server to be configured via both options:
    -   With Supabase _(current solution)_
    -   With local SQLite database in `.promptbook` folder in `CWD`
-   Keep in mind the DRY _(don't repeat yourself)_ principle
    -   Do some common abstracton for database
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   In future this will be part of `Dockerfile` but for now do not worry about Docker, just make sure the installation script works on fresh VPS server and starts the server after installation.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](prompts/screenshots/2026-05-0390-ptbk-agents-server-standalone-vps-script.png)

---

[ ] !!!

[✨🤬] Installation script installs the Agents server but the server crashes during first build, fix it

```bash

root@collboard-agents-server-x15:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash

...

root@collboard-agents-server-x15:~# pm2 logs 0
0|promptbook-agents-server  | 2026-05-25T11:44:38: [next-build] ./src/app/agents/[agentName]/AgentChatWrapper.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:38: [next-build] Module not found: Can't resolve '@common/hooks/usePromise'
0|promptbook-agents-server  | 2026-05-25T11:44:38: [next-build] https://nextjs.org/docs/messages/module-not-found
0|promptbook-agents-server  | 2026-05-25T11:44:38: [next-build] Import trace for requested module:
0|promptbook-agents-server  | 2026-05-25T11:44:38: [next-build] ./src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:38: [next-build] > Build failed because of webpack errors
0|promptbook-agents-server  | 2026-05-25T11:44:38: next-build exited with code 1.
0|promptbook-agents-server  | 2026-05-25T11:44:40: Starting Promptbook Agents Server on port 4440.
0|promptbook-agents-server  | 2026-05-25T11:44:40: [next-build] Building the Agents Server Next app.
0|promptbook-agents-server  | 2026-05-25T11:44:41: [next-build]    ▲ Next.js 15.4.11
0|promptbook-agents-server  | 2026-05-25T11:44:41: [next-build]    - Experiments (use with caution):
0|promptbook-agents-server  | 2026-05-25T11:44:41: [next-build]      ✓ externalDir
0|promptbook-agents-server  | 2026-05-25T11:44:41: [next-build]    Creating an optimized production build ...
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Failed to compile.
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] ./src/pages/_app.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Module parse failed: Unexpected token (1:12)
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] > import type { AppProps } from 'next/app';
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] | import '../app/globals.css';
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] |
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] ./src/pages/_document.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Module parse failed: Unexpected token (9:8)
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] | export default function LegacyPagesDocument() {
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] |     return (
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] >         <Html lang="en">
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] |             <Head />
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] |             <body className={`${APPLICATION_FONT_VARIABLE_CLASS_NAME} bg-white text-gray-900 antialiased`}>
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] ./src/pages/500.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Module parse failed: Unexpected token (28:8)
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] | export default function Custom500Page() {
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] |     return (
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] >         <>
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] |             <Head>
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] |                 <title>500 / Internal Server Error</title>
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Import trace for requested module:
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] ./src/pages/500.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] ./src/app/agents/[agentName]/AgentChatWrapper.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Module not found: Can't resolve '@/src/components/WalletRecordDialog/WalletRecordDialog'
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] https://nextjs.org/docs/messages/module-not-found
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Import trace for requested module:
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] ./src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] ./src/app/agents/[agentName]/AgentChatWrapper.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Module not found: Can't resolve '@common/hooks/usePromise'
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] https://nextjs.org/docs/messages/module-not-found
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] Import trace for requested module:
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] ./src/app/agents/[agentName]/book+chat/AgentBookAndChat.tsx
0|promptbook-agents-server  | 2026-05-25T11:44:52: [next-build] > Build failed because of webpack errors
0|promptbook-agents-server  | 2026-05-25T11:44:52: next-build exited with code 1.
0|promptbook-agents-server  | 2026-05-25T11:44:54: Starting Promptbook Agents Server on port 4440.
0|promptbook-agents-server  | 2026-05-25T11:44:54: [next-build] Building the Agents Server Next app.
0|promptbook-agents-server  | 2026-05-25T11:44:55: [next-build]    ▲ Next.js 15.4.11
0|promptbook-agents-server  | 2026-05-25T11:44:55: [next-build]    - Experiments (use with caution):
0|promptbook-agents-server  | 2026-05-25T11:44:55: [next-build]      ✓ externalDir
0|promptbook-agents-server  | 2026-05-25T11:44:55: [next-build]    Creating an optimized production build ...
...
```

```bash
root@collboard-agents-server-x15:~# pm2 show 0
 Describing process with id 0 - name promptbook-agents-server
┌───────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ status            │ online                                                                                                │
│ name              │ promptbook-agents-server                                                                              │
│ namespace         │ default                                                                                               │
│ version           │ N/A                                                                                                   │
│ restarts          │ 133                                                                                                   │
│ uptime            │ 3s                                                                                                    │
│ script path       │ /usr/bin/ptbk                                                                                         │
│ script args       │ agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh --port 4440 --no-ui │
│ error log path    │ /root/.pm2/logs/promptbook-agents-server-error.log                                                    │
│ out log path      │ /root/.pm2/logs/promptbook-agents-server-out.log                                                      │
│ pid path          │ /root/.pm2/pids/promptbook-agents-server-0.pid                                                        │
│ interpreter       │ /usr/bin/node                                                                                         │
│ interpreter args  │ N/A                                                                                                   │
│ script id         │ 0                                                                                                     │
│ exec cwd          │ /opt/promptbook-agents-server                                                                         │
│ exec mode         │ fork_mode                                                                                             │
│ node.js version   │ 22.22.2                                                                                               │
│ node env          │ N/A                                                                                                   │
│ watch & reload    │ ✘                                                                                                     │
│ unstable restarts │ 0                                                                                                     │
│ created at        │ 2026-05-25T11:19:56.818Z                                                                              │
└───────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────┘
 Actions available
┌────────────────────────┐
│ km:heapdump            │
│ km:cpu:profiling:start │
│ km:cpu:profiling:stop  │
│ km:heap:sampling:start │
│ km:heap:sampling:stop  │
└────────────────────────┘
 Trigger via: pm2 trigger promptbook-agents-server <action_name>

 Code metrics value
┌────────────────────────┬────────────┐
│ Heap Size              │ 139.62 MiB │
│ Heap Usage             │ 71.19 %    │
│ Used Heap Size         │ 99.39 MiB  │
│ Active requests        │ 3          │
│ Active handles         │ 3          │
│ Event Loop Latency     │ 747.55 ms  │
│ Event Loop Latency p95 │ 747.55 ms  │
└────────────────────────┴────────────┘
 Divergent env variables from local env
┌───────┬───────────────────────────────┐
│ PWD   │ /opt/promptbook-agents-server │
│ SHLVL │ 3                             │
└───────┴───────────────────────────────┘

```

-   Do a proper analysis of the current functionality of `ptbk agents-server` and `other/vps/install.sh` and related functionality before you start implementing.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts) and installation script at `other/vps/install.sh`

---

[-]

[✨🤬] brr

```bash
@@@

npm install ptbk

ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🤬] brr

```bash
@@@

npm install ptbk

ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
