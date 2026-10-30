<p align="center">
  <img src="https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/design/readme-wordmark.svg" alt="promptbook" width="570" />
</p>

<h1 align="center">You used to give AI tasks<br />Now it works for you</h1>

<p align="center">
  <a href="#quickstart"><strong>Quickstart</strong></a> ·
  <a href="#deploy-to-your-own-server"><strong>Deploy</strong></a> ·
  <a href="https://www.ptbk.io/en"><strong>Website</strong></a> ·
  <a href="specs/_main.md"><strong>Specifications</strong></a> ·
  <a href="https://www.ptbk.io/en/partnership"><strong>For partners</strong></a>
</p>

Give Promptbook an ongoing responsibility, a goal and your rules. Its agents find useful work, carry it through and ask when a decision needs you. **Your engine runs on your computer or server, with your files and your choice of models.**

![The dashboard controls an independent engine. The engine coordinates agents and tasks, records file changes in Git, and uses your selected models and tools.](https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/design/readme-engine.svg)

| Readable files | Traceable work | Your choice of AI |
| --- | --- | --- |
| Agents, tasks and conversations live in your project folder. | Review changes in Git and execution evidence in task traces. | Use supported harnesses such as Codex or Claude Code; local models depend on the adapter. |

**What could you hand over?** Promote each new podcast episode. Follow up with customers using their CRM history. Investigate and repair an overnight bug. These are illustrative agendas; actual work follows your configured tools, checks and permissions.

## Quickstart

If Node.js and npm are already installed, use the npm path below. On a clean Ubuntu VPS, use the [complete shell installation](#clean-ubuntu-vps).

Requires **Node.js 22.13+ in the 22.x line, or 24+**, **npm 10+**, Git and Chrome, Chromium or Edge. Setup guides you through selecting a supported harness and signing in.

```sh
npm install --global ptbk
mkdir my-agenda
cd my-agenda
ptbk init
```

### Clean Ubuntu VPS

On **Ubuntu 24.04 x86-64 with systemd**, run this in an interactive SSH terminal as root or an administrator with sudo:

```sh
curl -fsSL https://www.ptbk.io/install.sh | bash
```

You do not need Node.js, npm or Git installed first. The script uses the [shared server installer](deploy/ubuntu/install.sh), adds the prerequisites and published engine, then opens ordinary `ptbk init` as the `promptbook` user. [Inspect the entry script](https://github.com/webgptorg/ptbk-landing-page-aldaron/blob/main/public/install.sh) · [VPS guide](deploy/README.md#an-existing-vps-including-digitalocean-or-hetzner).

Describe the work in the initializer. It prepares the project and starts the engine in the background.

```sh
ptbk dashboard     # open the controls; closing them leaves the engine running
ptbk chat          # talk to your agents, in a separate terminal
ptbk stop          # finish the current task, then stop
ptbk start         # resume the agenda
```

The engine machine must stay available. By default, persistent project services return at OS startup: an agenda that was running can continue after checks; one you paused or stopped returns paused until you resume it. Its browser dashboard and API are available only on that computer through a loopback address, with no pairing step. [Local API access](specs/cli/api.md) · [Startup behavior](specs/cli/persistence.md)

**Windows:** download the EXE from [GitHub Releases](https://github.com/webgptorg/promptbook/releases), or follow the [installation guide](https://www.ptbk.io/en/open-source).

## Deploy to your own server

**A clean Ubuntu 24.04 LTS x86-64 server** with systemd, outbound HTTPS and root or sudo access over SSH needs no preinstalled Node.js, npm, Git, Chrome or AI harness: use the [one-command installation](#clean-ubuntu-vps). It prepares the server through the [shared installer](deploy/ubuntu/install.sh) and opens `ptbk init` as a dedicated non-sudo `promptbook` user. Sign-in to Codex or Claude Code is finished on your phone or computer; see the [server guide](deploy/README.md#finish-setup-over-ssh).

[![Set up a DigitalOcean Droplet](deploy/digitalocean/button.svg)](deploy/README.md#digitalocean)

**DigitalOcean:** create an Ubuntu Droplet with your SSH key and paste the prepared startup script. It prepares the server with persistent project storage and private dashboard access; then the same command over SSH continues into setup. [Open the DigitalOcean setup guide](deploy/README.md#digitalocean). The guide includes the required script-copy step; this is not a published Marketplace one-click image.

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fwebgptorg%2Fpromptbook%2Freborn%2F2026-10%2Fdeploy%2Fazure%2Fazuredeploy.json)

Create a **paid Ubuntu VPS in your own Azure account**, with a persistent disk, SSH restricted to your client IP, Node.js, Git, Chrome and the published engine. Review the provider's costs before confirming. Then connect over SSH and run the same command to continue into `ptbk init` and sign in to your chosen AI harness; the button prepares the server, while your agenda still needs setup.

On every path the engine runs as a dedicated user, keeps its dashboard private and can resume at boot after initialization. [All installation options](https://www.ptbk.io/en/open-source).

**[AWS EC2 setup](deploy/README.md#aws):** upload the prepared CloudFormation template to create a persistent Ubuntu server with the same installer. All providers require paid resources; after server preparation, the same command over SSH continues into attended `ptbk init` and AI sign-in.

## Built around your project

**Agent → Project → Task.** Agents keep the goals and rules; the project holds context; tasks record concrete work. This is the [APT Framework](specs/whitepaper.md).

Agent definitions are ordinary editable text:

```book
AGENT Product caretaker

GOAL Keep the product reliable and easy to maintain.
RULE Run the project's checks before reporting a fix.
RULE Ask before publishing outside the agreed release policy.
```

Set real project checks in `ptbk.json`; the initializer's placeholder is informational. Git tracks file changes, not every external action. External models and services receive the inputs you authorize.

## App, engine and support

This repository is the **self-hosted engine**. The upcoming **Promptbook app** adds convenient remote control through an end-to-end encrypted relay connection, separate from the engine's local dashboard. [Register interest](https://www.ptbk.io/en) or [deploy Promptbook for your clients](https://www.ptbk.io/en/partnership).

The [first-App specification](specs/app/integration.md) focuses on App-started VPS setup, project chat and native start/pause/stop controls. It also defines later extensions without claiming they are shipped. [Engine-owned automatic updates](specs/cli/updates.md) and [user-fixed rules for evolving agents](specs/concepts/anchoring.md) are target behavior; these documentation changes do not implement them.

[Command reference](specs/cli/cli.md) · [Book language](specs/book-language/_index.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

A star, a reproducible issue or a contribution helps us build Promptbook. Licensed under **[BUSL-1.1](LICENSE.md)**.
