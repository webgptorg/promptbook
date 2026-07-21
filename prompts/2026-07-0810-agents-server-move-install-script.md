[ ]

[✨🐟] Move install script

-   Move `other/vps/install.sh` to `install.sh` in the root of the repo and make sure it works
-   Install script is so important that it should be in the root of the repo and not in `other/vps/` folder
-   All other dependency scripts should stay in `other/vps/` and be called from the main `install.sh` script
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) install script
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**Move also the instructions in the project:**

```bash
sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/install.sh | bash -s -- \
    --non-interactive \
    --yes-i-understand-that-script-should-be-run-on-fresh-server \
    --domain lts.ptbk.io \
    --openai-api-key sk-proj-xxx \
    --admin-password xxx
```
