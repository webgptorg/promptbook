[ ] !!!!

[✨🍷] Fix Agent server

-   Agent server is successfully installed on the VPS, but it is not working properly and is returning 500 error on all requests immediately after the installation
-   You can look at https://s24.ptbk.io/ or ssh into the VPS `s24.ptbk.io` and check the logs
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

![alt text](screenshots/2026-06-0910-agents-server-fix-500.png)

**This is how the Agents server is installed:**

```bash
sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

**Here are the logs**

```bash
├ ƒ /api/v1/me                                                                 534 B         183 kB
├ ƒ /dashboard                                                               4.95 kB        1.46 MB
├ ƒ /docs                                                                    1.93 kB        1.89 MB
├ ƒ /docs/[docId]                                                            1.92 kB        1.89 MB
├ ƒ /embed                                                                   5.18 kB        1.87 MB
├ ƒ /experiments/story                                                        6.2 kB         257 kB
├ ƒ /humans.txt                                                                534 B         183 kB
├ ƒ /manifest.webmanifest                                                      534 B         183 kB
├ ƒ /openapi.json                                                              534 B         183 kB
├ ƒ /pixel-agents-assets/[...assetPath]                                        534 B         183 kB
├ ƒ /recycle-bin                                                             8.25 kB         280 kB
├ ƒ /restricted                                                                173 B         184 kB
├ ƒ /robots.txt                                                                534 B         183 kB
├ ƒ /s3/[first]/[second]/[hash]/[filename]                                     534 B         183 kB
├ ƒ /search                                                                  6.46 kB         190 kB
├ ƒ /security.txt                                                              534 B         183 kB
├ ƒ /sitemap.xml                                                               534 B         183 kB
├ ƒ /story/[[...story]]                                                        534 B         183 kB
├ ƒ /swagger                                                                 4.17 kB         245 kB
├ ƒ /system/profile                                                          2.87 kB         228 kB
├ ƒ /system/settings                                                         5.71 kB         226 kB
├ ƒ /system/user-memory                                                      5.49 kB         249 kB
├ ƒ /system/user-wallet                                                       9.4 kB         260 kB
├ ƒ /system/utilities                                                        1.65 kB         227 kB
├ ƒ /system/utilities/mocked-chats                                           19.3 kB         263 kB
├ ƒ /system/utilities/mocked-chats/view                                      8.94 kB        1.64 MB
├ ƒ /test/og-image                                                             534 B         183 kB
└ ƒ /test/og-image/opengraph-image                                             534 B         183 kB
+ First Load JS shared by all                                                 182 kB
  ├ chunks/1458-535c13223b5f7764.js                                           123 kB
  ├ chunks/87c73c54-3c195070c5cbb22b.js                                      54.1 kB
  └ other shared chunks (total)                                              5.56 kB

Route (pages)                                                                   Size  First Load JS
┌   /_app                                                                        0 B         144 kB
└ ○ /500 (1604 ms)                                                           3.87 kB         148 kB
+ First Load JS shared by all                                                 176 kB
  ├ chunks/framework-415b41e54b4434c6.js                                     57.7 kB
  ├ chunks/main-2181c948efb8a28f.js                                          82.6 kB
  ├ css/a051484109bbdfba.css                                                   32 kB
  └ other shared chunks (total)                                               3.8 kB

ƒ Middleware                                                                  279 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

[promptbook-vps] Publishing Agents Server Next static assets to /opt/promptbook-agents-server/.promptbook/next-static/_next/static.
[promptbook-vps] Starting Agents Server pm2 process promptbook-agents-server on port 4440.
[PM2] cron restart at 0 0 * * *
[PM2] Starting /opt/promptbook-agents-server/bin/ptbk in fork_mode (1 instance)
[PM2] Done.
┌────┬─────────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name                        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ promptbook-agents-server    │ default     │ N/A     │ fork    │ 46772    │ 0s     │ 0    │ online    │ 0%       │ 27.3mb   │ root     │ disabled │
└────┴─────────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[PM2] Saving current process list...
[PM2] Successfully saved in /root/.pm2/dump.pm2
[promptbook-vps] Waiting for promptbook-agents-server to become healthy at http://127.0.0.1:4440/api/health.
[promptbook-vps] promptbook-agents-server is healthy.
[promptbook-vps] Configuring nginx reverse proxy for raw IP access and s24.ptbk.io.
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
Synchronizing state of nginx.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.
Executing: /usr/lib/systemd/systemd-sysv-install enable nginx
[promptbook-vps] Requesting Let's Encrypt SSL certificate for s24.ptbk.io.
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Account registered.
Requesting a certificate for s24.ptbk.io

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/s24.ptbk.io/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/s24.ptbk.io/privkey.pem
This certificate expires on 2026-09-23.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.

Deploying certificate
Successfully deployed certificate for s24.ptbk.io to /etc/nginx/sites-enabled/promptbook-agents-server
Congratulations! You have successfully enabled HTTPS on https://s24.ptbk.io

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
If you like Certbot, please consider supporting our work by:
 * Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
 * Donating to EFF:                    https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[promptbook-vps] Agents Server is configured.
[promptbook-vps] URL: https://s24.ptbk.io
[promptbook-vps] Domains: s24.ptbk.io
[promptbook-vps] Project directory: /opt/promptbook-agents-server
[promptbook-vps] Repository: /opt/promptbook-agents-server/bin/613a476
[promptbook-vps] Environment: Live (main)
[promptbook-vps] Database: /opt/promptbook-agents-server/data/database/agents-server.sqlite
[promptbook-vps] File storage: self-contained-s3
[promptbook-vps] Self-contained S3 directory: /opt/promptbook-agents-server/data/s3
[promptbook-vps] Self-contained S3 service: promptbook-versitygw
[promptbook-vps] pm2 process: promptbook-agents-server
[promptbook-vps] pm2 hourly restart: 0 0 * * *
[promptbook-vps] nginx site: /etc/nginx/sites-available/promptbook-agents-server
[promptbook-vps] Useful commands:
[promptbook-vps]   sudo -u root pm2 status
[promptbook-vps]   sudo -u root pm2 logs promptbook-agents-server
[promptbook-vps]   sudo -u root pm2 restart promptbook-agents-server --update-env
[promptbook-vps]   sudo nginx -t && sudo systemctl reload nginx
[promptbook-vps]   sudo certbot renew --dry-run
root@collboard-agents-server-x24:~#
root@collboard-agents-server-x24:~#
root@collboard-agents-server-x24:~# pm2 logs 0
[TAILING] Tailing last 15 lines for [0] process (change the value with --lines option)
/root/.pm2/logs/promptbook-agents-server-error.log last 15 lines:
/root/.pm2/logs/promptbook-agents-server-out.log last 15 lines:
0|promptbo | 2026-06-25T15:44:57: [next]   digest: '3588702400'
0|promptbo | 2026-06-25T15:44:57: [next] }
0|promptbo | 2026-06-25T15:44:57: [next]  ⨯ Error [EnvironmentMismatchError]: Missing required `SESSION_SECRET` environment variable in production.0|promptbo | 2026-06-25T15:44:57: [next] The Agents Server signs session cookies with HMAC-SHA256 keyed by
0|promptbo | 2026-06-25T15:44:57: [next] `SESSION_SECRET`. Reusing `ADMIN_PASSWORD` or a hardcoded fallback
0|promptbo | 2026-06-25T15:44:57: [next] would let anyone who learns that value forge session tokens for any
0|promptbo | 2026-06-25T15:44:57: [next] user (including `admin`).
0|promptbo | 2026-06-25T15:44:57: [next] **Fix:** set `SESSION_SECRET` to a long random string (for example
0|promptbo | 2026-06-25T15:44:57: [next] the output of `openssl rand -hex 32`) in the deployment environment
0|promptbo | 2026-06-25T15:44:57: [next] and restart the server.
0|promptbo | 2026-06-25T15:44:57: [next]     at l (.next/server/chunks/5714.js:279:9647)
0|promptbo | 2026-06-25T15:44:57: [next]     at n (.next/server/chunks/5714.js:290:319)
0|promptbo | 2026-06-25T15:44:57: [next]     at <unknown> (.next/server/chunks/5714.js:290:1098) {
0|promptbo | 2026-06-25T15:44:57: [next]   digest: '3588702400'
0|promptbo | 2026-06-25T15:44:57: [next] }

0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]  ⨯ Error [EnvironmentMismatchError]: Missing required `SESSION_SECRET` environment variable in production.
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] The Agents Server signs session cookies with HMAC-SHA256 keyed by
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] `SESSION_SECRET`. Reusing `ADMIN_PASSWORD` or a hardcoded fallback
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] would let anyone who learns that value forge session tokens for any
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] user (including `admin`).
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] **Fix:** set `SESSION_SECRET` to a long random string (for example
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] the output of `openssl rand -hex 32`) in the deployment environment
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] and restart the server.
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]     at l (.next/server/chunks/5714.js:279:9647)
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]     at n (.next/server/chunks/5714.js:290:319)
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]     at <unknown> (.next/server/chunks/5714.js:290:1098) {
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]   digest: '3588702400'
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] }
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]  ⨯ Error [EnvironmentMismatchError]: Missing required `SESSION_SECRET` environment variable in production.
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] The Agents Server signs session cookies with HMAC-SHA256 keyed by
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] `SESSION_SECRET`. Reusing `ADMIN_PASSWORD` or a hardcoded fallback
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] would let anyone who learns that value forge session tokens for any
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] user (including `admin`).
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] **Fix:** set `SESSION_SECRET` to a long random string (for example
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] the output of `openssl rand -hex 32`) in the deployment environment
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] and restart the server.
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]     at l (.next/server/chunks/5714.js:279:9647)
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]     at n (.next/server/chunks/5714.js:290:319)
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]     at <unknown> (.next/server/chunks/5714.js:290:1098) {
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next]   digest: '3588702400'
0|promptbook-agents-server  | 2026-06-25T15:45:35: [next] }
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next]  ⨯ Error [EnvironmentMismatchError]: Missing required `SESSION_SECRET` environment variable in production.
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next] The Agents Server signs session cookies with HMAC-SHA256 keyed by
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next] `SESSION_SECRET`. Reusing `ADMIN_PASSWORD` or a hardcoded fallback
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next] would let anyone who learns that value forge session tokens for any
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next] user (including `admin`).
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next] **Fix:** set `SESSION_SECRET` to a long random string (for example
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next] the output of `openssl rand -hex 32`) in the deployment environment
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next] and restart the server.
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next]     at l (.next/server/chunks/5714.js:279:9647)
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next]     at n (.next/server/chunks/5714.js:290:319)
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next]     at <unknown> (.next/server/chunks/5714.js:290:1098) {
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next]   digest: '3588702400'
0|promptbook-agents-server  | 2026-06-25T15:45:37: [next] }
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next]  ⨯ Error [EnvironmentMismatchError]: Missing required `SESSION_SECRET` environment variable in production.
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next] The Agents Server signs session cookies with HMAC-SHA256 keyed by
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next] `SESSION_SECRET`. Reusing `ADMIN_PASSWORD` or a hardcoded fallback
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next] would let anyone who learns that value forge session tokens for any
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next] user (including `admin`).
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next] **Fix:** set `SESSION_SECRET` to a long random string (for example
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next] the output of `openssl rand -hex 32`) in the deployment environment
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next] and restart the server.
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next]     at l (.next/server/chunks/5714.js:279:9647)
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next]     at n (.next/server/chunks/5714.js:290:319)
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next]     at <unknown> (.next/server/chunks/5714.js:290:1098) {
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next]   digest: '3588702400'
0|promptbook-agents-server  | 2026-06-25T15:45:38: [next] }

```

# Application Error Report

## Human Summary

A server exception occurred while loading Promptbook Agents Server.

An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error. - the server for Promptbook Agents Server logged this failure.

## Correlation

-   Server: `Promptbook Agents Server`
-   Variant: `advanced`
-   Digest: `3588702400`
-   Next.js digest: `3588702400`
-   Reported at (UTC): `2026-06-25T15:44:59.886Z`

## Request Context

-   Page URL: `https://s24.ptbk.io/`

## Exception

-   Name: `Error`

### Message

```text
An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
```

### Stack Trace

```text
Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.
```

## Raw Report Payload

```json
{
    "variant": "advanced",
    "serverName": "Promptbook Agents Server",
    "digest": "3588702400",
    "nextDigest": "3588702400",
    "errorName": "Error",
    "errorMessage": "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.",
    "errorStack": "Error: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.",
    "pageUrl": "https://s24.ptbk.io/",
    "reportedAt": "2026-06-25T15:44:59.886Z"
}
```
