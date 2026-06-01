[x] ~$0.7578 an hour by OpenAI Codex `gpt-5.5`

[✨⛏] Use `@xterm/xterm` for terminal rendering in Agents Server

-   Now there is custom solution for terminal rendering in Agents Server, but it is not very good and has some issues, so we are going to replace it with `@xterm/xterm`, which is a popular and well-maintained terminal emulator library for the web, it provides a lot of features and is very customizable, so we can use it to create a better terminal experience for the users of the Agents Server
-   Use it in:
    -   `/admin/cli-access`
    -   `/admin/code-runners`
    -   `/admin/logs` _(just read only access to the terminal, without the ability to run commands)_
-   There is a build in access to the servers terminal as admin into Agents server for super `admin`
-   When you are logged in as super `admin` you are automatically connected to the terminal logged in
-   Terminal must support interactivity, colors, and all the features that `@xterm/xterm` provides, so users can interact with the terminal in same way as they would interact with a normal terminal from vscode
-   There are 3 levels of permissions for the users in the Agents server:
    -   Super `admin` - can access the terminal
    -   Normal `admin` - cannot access the terminal and even does not see the "CLI Access" menu item
    -   Normal user - cannot access the terminal and even does not see the "Super Admin" menu
-   Keep in mind the DRY _(don't repeat yourself)_ principle, there should be a single component for the terminal rendering and backend logic that can be reused in different parts of the Agents Server UI
-   You are working with the [Agents Server](apps/agents-server)
-   You are working with [auto installation script](vps/install.sh)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

---

[x] ~$0.2043 41 minutes by OpenAI Codex `gpt-5.5`

[✨⛏] Terminal in Agents Server lags one character behind, fix it

-   Problem is in `/admin/cli-access` and `/admin/code-runners`
-   You are working with the [Agents Server](apps/agents-server)

---

[ ] !!!

[✨⛏] Use `xterm` in `/admin/update`

-   it is already used in `/admin/cli-access` and `/admin/code-runners`
-   You are working with the [Agents Server](apps/agents-server)
-   Keep in mind the DRY _(don't repeat yourself)_ principle, there should be a single component for the terminal rendering and backend logic that can be reused in different parts of the Agents Server

