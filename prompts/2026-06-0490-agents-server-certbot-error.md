[ ]

[✨𓀚] When the certbot fails, show it

-   Now when the certbot fails, it shows nothing just https on the installed server isnt working, and the user has no idea what happened
-   Look at `prompts/2026-06-0490-agents-server-certbot-error.log`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) installed by the install.sh script

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```
