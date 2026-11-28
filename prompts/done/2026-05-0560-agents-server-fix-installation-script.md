[x] ~$0.5049 an hour by OpenAI Codex `gpt-5.5`

[✨🛸] Fix the Installation script

```shell
sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash

... Lot of installation logs ...

To address issues that do not require attention, run:
  npm audit fix

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.

Run `npm audit` for details.
[promptbook-vps] Installing Chromium and Playwright system dependencies for Agents Server browser features.
Installing dependencies...
Hit:1 http://mirrors.digitalocean.com/ubuntu noble InRelease
Hit:2 http://mirrors.digitalocean.com/ubuntu noble-updates InRelease
Hit:3 http://mirrors.digitalocean.com/ubuntu noble-backports InRelease
Hit:4 http://security.ubuntu.com/ubuntu noble-security InRelease
Hit:5 https://repos.insights.digitalocean.com/apt/do-agent main InRelease
Hit:6 https://deb.nodesource.com/node_22.x nodistro InRelease
Hit:7 https://repos-droplet.digitalocean.com/apt/droplet-agent main InRelease
Reading package lists... Done
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
libasound2t64 is already the newest version (1.2.11-1ubuntu0.2).
libatk-bridge2.0-0t64 is already the newest version (2.52.0-1build1).
libatk1.0-0t64 is already the newest version (2.52.0-1build1).
libatspi2.0-0t64 is already the newest version (2.52.0-1build1).
libcairo2 is already the newest version (1.18.0-3build1).
libcups2t64 is already the newest version (2.4.7-1.2ubuntu7.9).
libdbus-1-3 is already the newest version (1.14.10-4ubuntu4.1).
libdrm2 is already the newest version (2.4.125-1ubuntu0.1~24.04.1).
libdrm2 set to manually installed.
libgbm1 is already the newest version (25.2.8-0ubuntu0.24.04.1).
libglib2.0-0t64 is already the newest version (2.80.0-6ubuntu3.8).
libglib2.0-0t64 set to manually installed.
libnspr4 is already the newest version (2:4.35-1.1build1).
libnss3 is already the newest version (2:3.98-1ubuntu0.1).
libnss3 set to manually installed.
libpango-1.0-0 is already the newest version (1.52.1+ds-1build1).
libx11-6 is already the newest version (2:1.8.7-1build1).
libxcb1 is already the newest version (1.15-1ubuntu2).
libxcomposite1 is already the newest version (1:0.4.5-1build3).
libxdamage1 is already the newest version (1:1.1.6-1build1).
libxext6 is already the newest version (2:1.3.4-1build2).
libxfixes3 is already the newest version (1:6.0.0-2build1).
libxkbcommon0 is already the newest version (1.6.0-1build1).
libxrandr2 is already the newest version (2:1.5.2-2build1).
xvfb is already the newest version (2:21.1.12-1ubuntu1.5).
fonts-noto-color-emoji is already the newest version (2.047-0ubuntu0.24.04.1).
fonts-unifont is already the newest version (1:15.1.01-1build1).
libfontconfig1 is already the newest version (2.15.0-1.1ubuntu2).
libfreetype6 is already the newest version (2.13.2+dfsg-1ubuntu0.1).
libfreetype6 set to manually installed.
xfonts-cyrillic is already the newest version (1:1.0.5+nmu1).
xfonts-scalable is already the newest version (1:1.0.3-1.3).
fonts-liberation is already the newest version (1:2.1.5-3).
fonts-ipafont-gothic is already the newest version (00303-21ubuntu1).
fonts-wqy-zenhei is already the newest version (0.9.45-8).
fonts-tlwg-loma-otf is already the newest version (1:0.7.3-1).
fonts-freefont-ttf is already the newest version (20211204+svn4273-2).
0 upgraded, 0 newly installed, 0 to remove and 152 not upgraded.
[promptbook-vps] Writing Promptbook CLI launcher.
[promptbook-vps] GitHub Copilot CLI is already installed.
[promptbook-vps] Initializing Promptbook Agents Server project files.
""agents-server" is not a valid command or book. See 'ptbk --help'.
root@collboard-agents-server-x22:~#
```

