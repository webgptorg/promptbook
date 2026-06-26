[x] ~$0.00 an hour by OpenAI Codex `gpt-5.5`

[✨🌽] Optimize the Agents server app

-   The Agents server is installed on VPS
-   Focus mainly on frequent pages and scenarios, like homepage, creating new agent, running and chatting agent, etc.
-   You can look at testing server https://s24.ptbk.io/ or ssh into the VPS `s24.ptbk.io` and check the logs
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start optimizing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

