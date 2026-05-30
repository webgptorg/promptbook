[x] ~$0.00 an hour by GitHub Copilot `gpt-5.4`

[✨🤬] Add build in access to the servers CLI console as admin into Agents server for super `admin`

-   It should be possible to access the CLI console of the server directly from the Agents server UI for super `admin` users, so they can run commands on the server without needing to use SSH or other remote access tools, this is especially useful for users who are not familiar with command line interfaces or do not have access to SSH, and also it allows to run commands on the server directly from the Agents server UI, which can be more convenient and faster than using SSH or other remote access tools
-   You are adding raw access to the CLI not app-specific access, so the CLI console should allow to run any command on the server, without any restrictions or limitations, so the user can run any command they want on the server, with the same permissions as the user running the Agents server process
-   CLI console should be accessible from the menu "System" -> "Super Admin" -> "CLI Access"
-   There are 3 levels of permissions for the users in the Agents server:
    -   Super `admin` - can access the CLI console
    -   Normal `admin` - cannot access the CLI console and even does not see the "CLI Access" menu item
    -   Normal user - cannot access the CLI console and even does not see the "Super Admin" menu
-   Keep in mind the DRY _(don't repeat yourself)_ principle
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with [auto installation script](vps/install.sh)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

