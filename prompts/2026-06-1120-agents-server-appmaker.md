[ ]

[✨𓀁] baz

-   @@@@@@@
-   https://s24.ptbk.io/agents/z6gvAu4HGpdfGe/appmaker
-   The app
    -   For the created app create a ad-hoc port to run on
    -   Configure pm2
        -   The Agent server app can run only as single instance and there is a mechanism to prevent running multiple instances of the Agent server app, But be aware @@@
    -   Configure nginx
    -   Provide certificate
    -   Automatically run the apps on server startup
    -   In the menu under "System" add item "Appmaker" which should show the list of apps created by the agents
-   Every app should be initialized by `npm create next-app@latest` and then the agent based on the agent book should do the coding
-   The Agent server VPS is isolated so @@@
-   Use `.promptbook/appmaker/[appName]` folder for the apps
-   Add link to the agent context menu
-   Add metadata `IS_EXPERIMENTAL_APPMAKER_ENABLED` which should be by default `false`
-   When `IS_EXPERIMENTAL_APPMAKER_ENABLED` is `false`, do not allow to go to `/agents/[agentId]/appmaker` or show the link in the context menu or in the menu under "System"
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
    -   Anaylyze the Agents server, and the VPS installation script
    -   Analyze the `ptbk` CLI utility, and the `ptbk coder` command
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```
