[ ] !!!

[✨→] Installed server should contain self-contained S3 storage for files

-   It should be still possible to use external S3 storage, but if the user doesn't have it or doesn't want to use it, there should be a self-contained S3 storage included in the installation that can be used out of the box without any additional configuration
-   Use VersityGW for self-contained S3 storage, it is a lightweight and easy to use S3 compatible storage that can be easily installed and configured on the server, it provides all the features of a normal S3 storage and can be used as a drop-in replacement for any S3 compatible storage, so it is a good choice for our self-contained S3 storage solution
-   The folder to store the files for the self-contained S3 storage should be configurable, so the user can choose where they want to store the files on their server, but by default it should be stored in `/var/lib/promptbook-agents-server/s3`
-   Keep all the things like ids and prefixes same as for the external S3 storage, the consumer, the Agents server app should not care if it is using the self-contained S3 storage or the external S3 storage, it should work in the same way and use the same API for both storages, so it is easy to switch between them if needed
-   During the installation process, the user should be asked if they want to use the self-contained S3 storage or if they want to configure their own external S3 storage, if they choose the self-contained S3 storage, it should be automatically configured and set up during the installation process, so the user can start using it immediately after the installation is complete
-   The self-contained should be the default option, so if the user doesn't choose anything, it should be used by default
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

![alt text](prompts/screenshots/2026-06-0000-agents-server-self-contained-s3.png)
![alt text](prompts/screenshots/2026-06-0000-agents-server-self-contained-s3-1.png)
