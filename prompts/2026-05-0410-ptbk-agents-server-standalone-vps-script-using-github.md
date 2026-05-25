[ ] !!!!!

[✨🦛] Use GitHub repository (not NPM package) when installing Agents server via auto installation script

```bash
curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

-   Currently when installing fresh server it installs promptbook as NPM package, instead clone the git repository from GitHub
-   By this change, the installation script will always use the latest version from the GitHub repository and not be dependent on the NPM package registry
-   Do a proper analysis of the current functionality of install.sh, `ptbk agents-server` and related functionality before you start implementing.
-   You are working with [auto installation script](vps/install.sh)
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts) installed on fresh VPS
-   Do not change the publishing of the NPM packages itself, it should still be published as before, just the [auto installation script for VPS](vps/install.sh) should use GitHub repository instead of NPM packages
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🦛] bar

```bash
@@@

npm install ptbk

ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🦛] bar

```bash
@@@

npm install ptbk

ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🦛] bar

```bash
@@@

npm install ptbk

ptbk agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   You are working with [`ptbk agents-server`](src/cli/cli-commands/agents-server/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
