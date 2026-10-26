<p align="center">
  <img src="https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/design/readme-wordmark.svg" alt="promptbook" width="570" />
</p>

<h1 align="center">You used to give AI tasks<br />Now it works for you</h1>

<p align="center">
  <a href="#quickstart"><strong>Quickstart</strong></a> ·
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

Requires **Node.js 22.13+ in the 22.x line, or 24+**, **npm 10+**, Git and Chrome, Chromium or Edge. Setup guides you through selecting a supported harness and signing in.

```sh
npm install --global ptbk
mkdir my-agenda
cd my-agenda
ptbk init
```

Describe the work in the initializer. It prepares the project and starts the engine in the background.

```sh
ptbk dashboard     # open the controls; closing them leaves the engine running
ptbk chat          # talk to your agents, in a separate terminal
ptbk stop          # finish the current task, then stop
ptbk start         # resume the agenda
```

The engine machine must stay available. By default, the engine resumes at login. Its browser dashboard and API are available only on that computer through a loopback address, with no pairing step. [Local API access](specs/cli/api.md) · [Startup behavior](specs/cli/persistence.md)

**Windows:** download the EXE from [GitHub Releases](https://github.com/webgptorg/promptbook/releases), or follow the [installation guide](https://www.ptbk.io/en/open-source).

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

[Command reference](specs/cli/cli.md) · [Book language](specs/book-language/_index.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

A star, a reproducible issue or a contribution helps us build Promptbook. Licensed under **[BUSL-1.1](LICENSE.md)**.
