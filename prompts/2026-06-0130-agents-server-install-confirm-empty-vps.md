[ ] !

[✨🏅] The VPS installations script is meant for fresh VPS, require confirmation

-   The installation script for the Agents Server on VPS is meant to be run on a fresh _(like fresh DigitalOcean droplet),_ without any existing data or configuration.
-   When installing on a non-fresh VPS, there is a risk of overwriting existing data or configuration, which can lead to data loss or service disruption.
-   To prevent accidental data loss, the installation script should ask before proceeding with the installation
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```
