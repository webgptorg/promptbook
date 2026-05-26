[ ] !!!!!!!

[✨🤬] When installing Agents server through auto installation script `install.sh`, check resources and optionally add swap if needed

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

-   Automatically check free disk space and memory before installing
-   When there is not enough free disk space or memory, ask the user if they want to add swap file to increase the available memory, add just the amount of swap needed to reach the minimum required memory for the installation, and then continue with the installation
-   If not enough disk space, ask the user if they want to continue with the installation
-   The Agents server needs at least 8GB of free memory and 15GB of free disk space to be installed and run properly, so you can use these values as the minimum required resources for the installation
-   When adding swap, add just the amount of swap needed to reach 8GB of total memory (RAM + swap), so if there is already 4GB of RAM, add 4GB of swap, if there is already 6GB of RAM, add 2GB of swap, and so on
-   Add the swap permanently to the system, so it will be available after reboot, and also make sure it is properly configured and optimized for performance
-   Keep in mind the DRY _(don't repeat yourself)_ principle
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with [auto installation script](vps/install.sh)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
