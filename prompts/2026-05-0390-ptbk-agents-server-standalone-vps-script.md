[ ] !!!!

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
