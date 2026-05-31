[x] ~$0.2234 37 minutes by OpenAI Codex `gpt-5.5`

[✨🧥] Put all the installation questions first, then heavy installing

```bash
curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash

Coding runner [github-copilot]:
Runner model [gpt-5.4]:
Runner thinking level [xhigh]:
Agents Server port [4440]:
[promptbook-vps] Installing system packages.
Hit:1 http://mirrors.digitalocean.com/ubuntu noble InRelease
Hit:2 http://mirrors.digitalocean.com/ubuntu noble-updates InRelease
Hit:3 http://mirrors.digitalocean.com/ubuntu noble-backports InRelease
Hit:4 https://repos-droplet.digitalocean.com/apt/droplet-agent main InRelease
Get:5 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]
Get:6 http://security.ubuntu.com/ubuntu noble-security/universe amd64 Packages [1191 kB]
Get:7 http://security.ubuntu.com/ubuntu noble-security/universe Translation-en [230 kB]
...
```

_... Lot of installation logs and waiting_

**Then waiting for user again:**

```bash
0 upgraded, 0 newly installed, 0 to remove and 61 not upgraded.
[promptbook-vps] Writing Promptbook CLI launcher.
[promptbook-vps] GitHub Copilot CLI is already installed.
[promptbook-vps] Initializing Promptbook Agents Server project files.
Public Agents Server URL [https://s22.ptbk.io]:
```

**Then another heavy work:**

```bash
Building Promptbook Agents Server.
   ▲ Next.js 15.4.11
   - Experiments (use with caution):
     ✓ externalDir

   Creating an optimized production build ...

```

-   Purpose of this task is to ask all the questions first, then do all the heavy installation work
-   So user can answer all the questions at once, then just wait for the installation to finish, without needing to interact with the installation process multiple times
-   Purpose of this task is to group all the questions together at the beginning of the installation process, so user can answer them all at once, then just wait for the installation to finish, without needing to interact with the installation process multiple times
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of the installation script and related functionality before you start implementing.
-   You are working with [auto installation script](vps/install.sh)

