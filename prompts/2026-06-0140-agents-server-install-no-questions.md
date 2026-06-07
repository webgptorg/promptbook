[ ] !!

[✨〰️] The installation of the Agents Server on VPS should be able to run without asking any questions

-   Mode without questions is needed for the automated installation of the Agents server on VPS, which is part of the deployment process.
-   It should take all the default values and install the server without asking any questions.
-   Be aware that by default you answer [yes] to configure the code agent runner _(like openai-codex and github-copilot)_ but it requires interactive input to configure it, so the non-interactive mode should skip this part and just not configure the code agent runner.
-   Code runner can be later configured manually from UI or ssh
-   Keep in mind the DRY _(don't repeat yourself)_ principle, as many as possible of the existing code should be reused in both interactive and non-interactive mode.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**Now the Agents server is installed:**

```bash
sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

**But it should also support non-interactive installation:**

```bash
sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash -s -- --non-interactive
```
