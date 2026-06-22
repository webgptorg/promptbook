[ ] !!

[✨🛑] Installed server should contain self-contained Sentry-compatile Poplach

-   Poplach is a self-hosted error tracking and monitoring solution that is compatible with Sentry, look at @@@
-   During the installation process, the user should be asked if they want to use Sentry, user can enter the sentry DSN or leave it empty if they don't want to use Sentry
-   When it leaves the DSN empty, the server should be installed with Poplach and auto-confifure the Sentry-compatible endpoint to the local Poplach instance, so that the server can send the errors to the local Poplach instance without any additional configuration
-   Poplach should be accessible through the web interface for super admin, simmalarly to the Database or Logs
-   Poplach should not be accessible for the regular users, only for the super admin, so that the regular users don't have access to the error tracking and monitoring data
-   The self-contained should be the default option, so if the user doesn't choose anything, it should be used by default
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing. Also study the Poplach and Sentry documentation and how it can be integrated with the server.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```
