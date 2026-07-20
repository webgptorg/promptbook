# Self-update is orchestrated by the already-installed `install.sh` — servers on npm-era scripts cannot heal from the panel

While fixing the failing self-update (`prompts/2026-07-0471-agents-server-agent-fix-self-update.md`, failure log from 2026-07-20 on `live.ptbk.io`), the root cause turned out to be **operational, not (only) a bug on `main`**.

## The mechanism

`/admin/update` spawns the installer script resolved from `PTBK_VPS_INSTALL_SCRIPT` in `/opt/promptbook-agents-server/.env` — which always points into the **currently deployed release** (for example `/opt/promptbook-agents-server/bin/7d65763/other/vps/install.sh`). That old script then copies **itself** to a stable location and orchestrates the whole update. Fixes committed to `main` therefore only take effect **one successful update later**.

`live.ptbk.io` was deployed at `7d65763`, whose script still installed `code-server` via `npm install --global` — which always fails as root on npm ≥ 9 (`Please pass --unsafe-perm to npm to install code-server`) — and that hard failure aborted every update **before** any new code could run. A chicken-and-egg: the panel could never deliver the fix that was already on `main` (`1766ae96c`, `0f4b7fffd` — standalone code-server installer + `apply-dependencies` delegation).

## How such a server is recovered

One manual run of a current `install.sh` over SSH — it detects the existing installation and performs **exactly the standard self-update** (same code path as the panel), then repoints `PTBK_VPS_INSTALL_SCRIPT` at the new release:

```bash
ssh root@<server>
curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/main/other/vps/install.sh -o /tmp/promptbook-install.sh
bash /tmp/promptbook-install.sh
```

(Equivalent shortcut for the code-server case only: install code-server standalone once — the old script's `command -v code-server` guard then skips the broken npm path.)

**`live.ptbk.io` no longer needs this** — by 2026-07-21 it was already bootstrapped (deployed at `9177e4d`, `code-server` present at `/usr/local/bin/code-server`) and an automatic self-update to `921ad3e24` ran successfully. But **any other standalone VPS still deployed at a release between `7d65763` and `1766ae96c`** (npm-era code-server install) will show the same permanently failing `/admin/update` and needs the manual bootstrap above.

## Guard added

`self_update_agents_server` now treats the dependency-ensure step (`install_agents_server_dependency_requirements`) as non-fatal — a failing optional host-software installation warns and lets the update finish (it is retried on the next update, since dependencies are re-ensured every run). This prevents any future recurrence of the "one broken/unavailable dependency bricks all updates" class. Covered by `src/cli/other/vpsInstall.test.ts`.

## Out-of-prompt change (justification)

Two `install.sh` regression tests in `src/cli/other/vpsInstall.test.ts` (`keeps raw-IP bootstrap access…`, `proxies browser VS Code sessions…`) were failing on unmodified `main` — stale assertions left behind by the domains/nginx overhaul in `921ad3e24` (per-domain certificates, generated nginx site). They were realigned with the new architecture (asserting the equivalent invariants: per-domain `certbot certonly` failure isolation, HTTPS public URL only after the certificate exists, VS Code location block composed via `build_nginx_agents_server_location_blocks`) so the suite runs green again; no behavior was changed.
