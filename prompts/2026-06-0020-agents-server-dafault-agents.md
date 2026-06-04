[x] ~$0.5106 an hour by OpenAI Codex `gpt-5.5`

[✨🌗] When creating new Agents server via install script it should contain default agents

-   The default agents should be created from folder `agents/default` in this repository, each `*.book` file should correspond to agent.
-   During the installation process, ask the user if they want to install the default agents, if they choose yes, then the agents from `agents/default` should be installed and created in the Agents server, so the user can start using them immediately after the installation is complete, if they choose no, then no agents should be created and the user can create their own agents from scratch or import them later
-   By default the default agents are created
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

