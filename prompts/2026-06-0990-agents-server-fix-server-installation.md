[ ] !!!!

[✨🔫] During the server installation, fix "`headers` was called outside a request scope"

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

```console
root@collboard-agents-server-x24:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash -s --     --non-interactive     --yes-i-understand-that-script-should-be-run-on-fresh-server     --domain s24.ptbk.io   --openai-api-key sk-proj-xxx     --sentry-dsn https://xxx@xxx.ingest.de.sentry.io/4511534509785168     --admin-password xxx
[promptbook-vps] Warning: This installer is meant for a fresh VPS with no existing Promptbook data or server configuration to preserve.[promptbook-vps] Warning: Running it on a non-fresh VPS can overwrite existing data or configuration and cause data loss or service disruption.
[promptbook-vps] Fresh VPS installation was explicitly confirmed.
[promptbook-vps] Checking VPS resources.
[promptbook-vps] Resources OK: 8.0 GiB memory and 64.2 GiB free disk.
[promptbook-vps] Before SSL is issued, point these DNS records to this VPS:
[promptbook-vps]   s24.ptbk.io  A  134.122.27.41
[promptbook-vps] If your VPS provider gave you an IPv6 address, add matching AAAA records as well.
[promptbook-vps] Installing system packages.
Hit:1 http://security.ubuntu.com/ubuntu noble-security InRelease
Hit:2 http://mirrors.digitalocean.com/ubuntu noble InRelease
Hit:3 http://mirrors.digitalocean.com/ubuntu noble-updates InRelease
Hit:4 http://mirrors.digitalocean.com/ubuntu noble-backports InRelease
Hit:5 https://repos.insights.digitalocean.com/apt/do-agent main InRelease
Hit:6 https://deb.nodesource.com/node_22.x nodistro InRelease
Hit:7 https://repos-droplet.digitalocean.com/apt/droplet-agent main InRelease
Reading package lists... Done
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
ca-certificates is already the newest version (20260601~24.04.1).
curl is already the newest version (8.5.0-2ubuntu10.9).
git is already the newest version (1:2.43.0-1ubuntu7.3).
gnupg is already the newest version (2.4.4-2ubuntu17.4).
util-linux is already the newest version (2.39.3-9ubuntu6.5).
tar is already the newest version (1.35+dfsg-3ubuntu0.1).
tar set to manually installed.
build-essential is already the newest version (12.10ubuntu1).
python3 is already the newest version (3.12.3-0ubuntu2.1).
python3 set to manually installed.
make is already the newest version (4.3-4.1build2).
g++ is already the newest version (4:13.2.0-7ubuntu1).
openssl is already the newest version (3.0.13-0ubuntu3.11).
openssl set to manually installed.
nginx is already the newest version (1.24.0-2ubuntu7.13).
libnginx-mod-http-headers-more-filter is already the newest version (1:0.37-2build1).
certbot is already the newest version (2.9.0-1).
python3-certbot-nginx is already the newest version (2.9.0-1).
0 upgraded, 0 newly installed, 0 to remove and 48 not upgraded.
[promptbook-vps] Node.js v22.23.1 is already installed.
[promptbook-vps] Configuring /opt/promptbook-agents-server.
[promptbook-vps] Installing pm2.

changed 90 packages in 8s

8 packages are looking for funding
  run `npm fund` for details
[promptbook-vps] Installing Promptbook from https://github.com/webgptorg/promptbook.git (main) into /opt/promptbook-agents-server/bin/30d76b2.
HEAD is now at 30d76b2 🔼🆚 Update Promptbook `0.112.0-136` -> `0.112.0-139`
[promptbook-vps] Installing Promptbook repository dependencies.
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: react-copy-to-clipboard@5.1.0
npm warn Found: react@19.1.2
npm warn node_modules/react
npm warn   dev react@"19.1.2" from the root project
npm warn   34 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^15.3.0 || 16 || 17 || 18" from react-copy-to-clipboard@5.1.0
npm warn node_modules/swagger-ui-react/node_modules/react-copy-to-clipboard
npm warn   react-copy-to-clipboard@"5.1.0" from swagger-ui-react@5.31.2
npm warn   node_modules/swagger-ui-react
npm warn
npm warn Conflicting peer dependency: react@18.3.1
npm warn node_modules/react
npm warn   peer react@"^15.3.0 || 16 || 17 || 18" from react-copy-to-clipboard@5.1.0
npm warn   node_modules/swagger-ui-react/node_modules/react-copy-to-clipboard
npm warn     react-copy-to-clipboard@"5.1.0" from swagger-ui-react@5.31.2
npm warn     node_modules/swagger-ui-react
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: react-debounce-input@3.3.0
npm warn Found: react@19.1.2
npm warn node_modules/react
npm warn   dev react@"19.1.2" from the root project
npm warn   34 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^15.3.0 || 16 || 17 || 18" from react-debounce-input@3.3.0
npm warn node_modules/swagger-ui-react/node_modules/react-debounce-input
npm warn   react-debounce-input@"=3.3.0" from swagger-ui-react@5.31.2
npm warn   node_modules/swagger-ui-react
npm warn
npm warn Conflicting peer dependency: react@18.3.1
npm warn node_modules/react
npm warn   peer react@"^15.3.0 || 16 || 17 || 18" from react-debounce-input@3.3.0
npm warn   node_modules/swagger-ui-react/node_modules/react-debounce-input
npm warn     react-debounce-input@"=3.3.0" from swagger-ui-react@5.31.2
npm warn     node_modules/swagger-ui-react
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: react-inspector@6.0.2
npm warn Found: react@19.1.2
npm warn node_modules/react
npm warn   dev react@"19.1.2" from the root project
npm warn   34 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"^16.8.4 || ^17.0.0 || ^18.0.0" from react-inspector@6.0.2
npm warn node_modules/swagger-ui-react/node_modules/react-inspector
npm warn   react-inspector@"^6.0.1" from swagger-ui-react@5.31.2
npm warn   node_modules/swagger-ui-react
npm warn
npm warn Conflicting peer dependency: react@18.3.1
npm warn node_modules/react
npm warn   peer react@"^16.8.4 || ^17.0.0 || ^18.0.0" from react-inspector@6.0.2
npm warn   node_modules/swagger-ui-react/node_modules/react-inspector
npm warn     react-inspector@"^6.0.1" from swagger-ui-react@5.31.2
npm warn     node_modules/swagger-ui-react
npm warn deprecated crypto@1.0.1: This package is no longer supported. It's now a built-in Node module. If you've depended on crypto, you should switch to the one that's built-in.
npm warn deprecated y-websocket-server@1.0.2: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated stable@0.1.8: Modern JS already guarantees Array#sort() is a stable sort, so this library is deprecated. See the compatibility table on MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#browser_compatibility
npm warn deprecated lodash.get@4.4.2: This package is deprecated. Use the optional chaining (?.) operator instead.
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated glob@8.1.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternativesare available.
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version.
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated rollup-plugin-visualizer@5.13.1: Contains unintended breaking changes
npm warn deprecated @azure/openai@1.0.0-beta.13: The Azure OpenAI client library for JavaScript beta has been retired. Please migrate to the stable OpenAI SDK for JavaScript using the migration guide: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/openai/openai/MIGRATION.md.
npm warn deprecated @finom/zod-to-json-schema@3.24.11: Use https://www.npmjs.com/package/zod-v3-to-json-schema instead. See issue comment for details: https://github.com/StefanTerdell/zod-to-json-schema/issues/178#issuecomment-3533122539
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 2173 packages, and audited 2174 packages in 2m

315 packages are looking for funding
  run `npm fund` for details

105 vulnerabilities (6 low, 64 moderate, 33 high, 2 critical)

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
Hit:2 https://repos.insights.digitalocean.com/apt/do-agent main InRelease
Hit:3 https://deb.nodesource.com/node_22.x nodistro InRelease
Hit:4 http://mirrors.digitalocean.com/ubuntu noble-updates InRelease
Hit:5 http://mirrors.digitalocean.com/ubuntu noble-backports InRelease
Hit:6 http://security.ubuntu.com/ubuntu noble-security InRelease
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
libcups2t64 is already the newest version (2.4.7-1.2ubuntu7.14).
libdbus-1-3 is already the newest version (1.14.10-4ubuntu4.1).
libdrm2 is already the newest version (2.4.125-1ubuntu0.1~24.04.2).
libdrm2 set to manually installed.
libgbm1 is already the newest version (25.2.8-0ubuntu0.24.04.2).
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
xvfb is already the newest version (2:21.1.12-1ubuntu1.6).
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
0 upgraded, 0 newly installed, 0 to remove and 48 not upgraded.
[promptbook-vps] Writing Promptbook CLI launcher.
[promptbook-vps] Initializing Promptbook Agents Server project files.
[promptbook-vps] Installing bundled default agents when the server has no agents yet.
Skipping default agents because the server already has 13 agents.
Failed to install default agents:
`headers` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context
root@collboard-agents-server-x24:~#
```
