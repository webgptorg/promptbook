[ ] !!

[✨⚪️] Fix Promptbook Agents Server installation

```
Restarting services...

Service restarts being deferred:
 /etc/needrestart/restart.d/dbus.service
 systemctl restart getty@tty1.service
 systemctl restart serial-getty@ttyS0.service
 systemctl restart systemd-logind.service
 systemctl restart unattended-upgrades.service

No containers need to be restarted.

User sessions running outdated binaries:
 root @ session #1: bash[1145], sshd[1029]
 root @ user manager service: systemd[1035]

No VM guests are running outdated hypervisor (qemu) binaries on this host.
Downloading Chrome for Testing 145.0.7632.6 (playwright chromium v1208) from https://cdn.playwright.dev/builds/cft/145.0.7632.6/linux64/chrome-linux64.zip
167.3 MiB [====================] 100% 0.0s
Chrome for Testing 145.0.7632.6 (playwright chromium v1208) downloaded to /root/.cache/ms-playwright/chromium-1208
Downloading FFmpeg (playwright ffmpeg v1011) from https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-linux.zip
2.3 MiB [====================] 100% 0.0s
FFmpeg (playwright ffmpeg v1011) downloaded to /root/.cache/ms-playwright/ffmpeg-1011
Downloading Chrome Headless Shell 145.0.7632.6 (playwright chromium-headless-shell v1208) from https://cdn.playwright.dev/builds/cft/145.0.7632.6/linux64/chrome-headless-shell-linux64.zip
110.9 MiB [====================] 100% 0.0s
Chrome Headless Shell 145.0.7632.6 (playwright chromium-headless-shell v1208) downloaded to /root/.cache/ms-playwright/chromium_headless_shell-1208
[promptbook-vps] Writing Promptbook CLI launcher.
[promptbook-vps] Installing GitHub Copilot CLI.

added 3 packages in 11s
[promptbook-vps] Initializing Promptbook Agents Server project files.
[promptbook-vps] Installing bundled default agents when the server has no agents yet.
node:internal/modules/cjs/loader:1430
  const err = new Error(message);
              ^

Error: Cannot find module '@promptbook-local/utils'
Require stack:
- /opt/promptbook-agents-server/bin/f2b8ae8/apps/agents-server/src/database/$provideSupabaseForServer.ts- /opt/promptbook-agents-server/bin/f2b8ae8/apps/agents-server/src/database/seedDefaultAgents.ts
    at node:internal/modules/cjs/loader:1430:15
    at nextResolveSimple (/root/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-BOkp8V6j.cjs:10:1017)
    at /root/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-BOkp8V6j.cjs:9:4388
    at /root/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-BOkp8V6j.cjs:9:3818
    at resolveTsPaths (/root/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-BOkp8V6j.cjs:10:770)
    at /root/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-BOkp8V6j.cjs:10:1155
    at T._resolveFilename (file:///root/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-CqMfTiWi.mjs:2:14889)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
    at Function._load (node:internal/modules/cjs/loader:1216:25) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    '/opt/promptbook-agents-server/bin/f2b8ae8/apps/agents-server/src/database/$provideSupabaseForServer.ts',
    '/opt/promptbook-agents-server/bin/f2b8ae8/apps/agents-server/src/database/seedDefaultAgents.ts'
  ]
}

Node.js v22.22.3
```

.

-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```
