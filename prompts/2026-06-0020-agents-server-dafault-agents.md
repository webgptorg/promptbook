[ ] !!!

[✨🌗] When creating new Agents server via install script it should contain default agents

-   When the server is installed via the auto installation script it should contain palette of default agents, so the user can start using the server and testing it immediately after the installation without the need to create agents from scratch or import them, this will make the onboarding experience much better and smoother for the users, and also will allow them to see how the agents work and what they can do right after the installation, so they can start experimenting with them and creating their own agents based on the default ones
-   The default agents should be sourced from folder `agents/default` in this repository, each `*.book` file should correspond to agent.
-   During the installation process, ask the user if they want to install the default agents, if they choose yes, then the agents from `agents/default` should be installed and created in the Agents server, so the user can start using them immediately after the installation is complete, if they choose no, then no agents should be created and the user can create their own agents from scratch or import them later
-   By default the default agents are created
-   When updating a server that already has agents, the default agents should not be created again
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```
