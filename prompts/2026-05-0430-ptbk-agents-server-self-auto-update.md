[ ] !!!

[✨⬆] Add build in self-update into Agents server for super `admin`

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

-   _(@@@ wait until `2026-05-0391-ptbk-agents-server-standalone-vps-script-configuration-throught-ui-and-servers.md` is ready)_
-   Use the git repository of the Promptbook to implement the self-update functionality
-   The update is always done against 4 different environmets:
    1. Live environment, which is the `main` branch of the repository
    2. `preview` branch of the repository
    3. `production` branch of the repository
    4. `LTS` branch of the repository
-   By default, the server is running on the `production` branch, but the super `admin` can switch to any of the other branches through the UI, and the server will automatically update to the latest commit of that branch, also ask during the installation process which environment the user wants to use, and by default use `production`, but allow them to choose `main`, `preview` or `LTS` if they want to use those environments instead of `production`
-   When there is new commit in the branch which is currently used by the server, the updating page should show that there is a new update available, and allow the super `admin` to do the update with one click
    -   Do everything to make the update process, downloading the new code, installing dependencies, running migrations, restarting the server,... as smooth as possible, so the user just clicks one button and the server is updated to the latest version without any issues
-   Update page should be accessible from the menu "System" -> "Super Admin" -> "Update"
-   There are 3 levels of permissions for the users in the Agents server:
    -   Super `admin` - can access the update page and do the update
    -   Normal `admin` - cannot access the update page and even does not see the "Update" menu item
    -   Normal user - cannot access the update page and even does not see the "Super Admin" menu
-   Keep in mind the DRY _(don't repeat yourself)_ principle
-   The server is initialized by [auto installation script](vps/install.sh)
-   You are working with [auto installation script](vps/install.sh)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
