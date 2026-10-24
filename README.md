# Promptbook

## You used to give AI tasks. Now it works for you.

**Your AI. On your machine. Under your control.**

Give Promptbook an ongoing responsibility, a goal and your rules. Its agents identify useful work, turn it into tasks and carry it through. They keep the context, follow up and come back to you when a decision needs you. You can close the dashboard while your agenda keeps running.

Maintain a product. Keep customer conversations moving. Turn each new podcast episode into published content. The work continues beyond the first result.

[Explore Promptbook](https://www.ptbk.io/en) · [Run the engine yourself](#run-the-engine-yourself) · [Deploy for your clients](https://www.ptbk.io/en/partnership)

## An agenda that keeps going

Imagine a message arriving late at night: a customer has found a broken checkout. Your development agent picks it up, finds the cause, writes a fix and runs the project's checks. It records the result in Git, deploys when your rules permit it, and follows up. In the morning, you can review what happened and exactly what changed.

The lasting instruction is to take care of the product. Individual tasks are the steps toward that goal. Promptbook can work from an existing backlog, handle recurring work and identify useful next steps from its agents' goals. When there is nothing to do, it waits.

The same approach extends beyond development:

| Agenda | What continued work looks like |
| --- | --- |
| **Podcast and content** | A new AI ta Krajta episode is published. An agent processes it, prepares channel-specific posts, credits the people involved and handles the agreed promotion. |
| **Customer relationships** | A customer's new branch gives an agent a reason to reconnect. It reviews past conversations, prepares a personal email and follows up in the CRM. |
| **Software maintenance** | An issue arrives overnight. An agent investigates, repairs, checks and records the result, then follows the project's release rules. |

These are illustrative agendas, configured around your tools, access and permissions. You decide what agents may do themselves, what needs review and how a result is checked.

## Truly yours

**Run it where you choose.** The engine works on your computer, a machine in your office or a VPS under your control. It owns the work; opening or closing an interface does not own its lifetime. The machine running the engine must remain available.

**Choose the AI that does the work.** Agent roles, rules and knowledge are separate from their execution tools. Promptbook uses supported coding-agent CLIs, called *harnesses*, to perform work with files, browsers and other tools. Codex and Claude Code are the featured starting points; other adapters are available. Local models can be used where the selected harness supports them. Suitability depends on the model, hardware and task.

**Open the folder and understand it.** Your agents, tasks, conversations and working materials live in readable files. You can inspect them in your editor, change them, copy them and hand them to another person or tool. The value you build up stays accessible when you change a model or execution environment.

**See what changed.** Git records versioned changes to your project, instructions and work. Task traces preserve the execution evidence exposed by the tools. You can review a diff and its associated task instead of relying on a final message saying “done.” Git history covers files; reverting it does not undo an email or another action in an external service.

## The engine and the app

This repository contains the **self-hosted Promptbook engine**, published as the `ptbk` npm package. You can install and operate it directly through its CLI and dashboards.

We are also building the **Promptbook app**: convenient control of your own engine from a laptop or phone, as part of the commercial offering with support and partner deployment. Its planned end-to-end encrypted connection passes through a relay that is not trusted to decrypt your working content. The files and ongoing work remain with your engine.

That application connection is separate from the engine's current paired browser dashboard and Cloudflare tunnel. The current tunnel is not a claim of end-to-end confidentiality from its provider.

Your choice of AI is another boundary: an external model receives the inputs the engine sends to it. A local model can keep model processing on your infrastructure; connected external tools still receive the data you authorize them to use.

[Register interest in the app or get deployment help](https://www.ptbk.io/en) · [Partner with us](https://www.ptbk.io/en/partnership)

## A simple foundation: Agent–Project–Task

Promptbook follows the **APT Framework**:

- **Agent:** who works, with which goals, knowledge and rules.
- **Project:** the materials and context the work belongs to.
- **Task:** a concrete piece of work, its result and its history.

Agents and tasks are written in the readable **Book** format. Conversations live alongside them, so decisions stay connected to the project. The engine coordinates their work, while Git preserves the versioned history.

For example, a lasting responsibility can be expressed as ordinary text:

```book
AGENT Product caretaker

GOAL Keep the product useful, reliable and easy to maintain.
RULE Use the project's checks to verify changes.
RULE Ask before changing product direction or publishing outside the agreed release policy.
```

The definition is editable source. It is not tied to the weights of a particular model, and it does not itself grant access to accounts or services.

[Read the APT whitepaper](specs/whitepaper.md) · [Explore the Book language](specs/book-language/_index.md)

## Run the engine yourself

### Requirements

- Node.js **22.13 or newer in the 22.x line, or 24+**, npm **10+**, and Git.
- Access to a supported harness. `ptbk init` can install a missing CLI and guide you through its login. Featured choices are OpenAI Codex and Claude Code.
- Google Chrome, Chromium or Microsoft Edge for the project browser.

### Install with npm

```sh
npm install --global ptbk
ptbk --version
```

### Windows installer

Download `Promptbook-Setup-<version>-windows-x64.exe` from the matching [GitHub Release](https://github.com/webgptorg/promptbook/releases). It prepares missing Node.js, npm and Git, installs that release of `ptbk`, offers a first project folder and opens the ordinary `ptbk init` setup in a terminal.

[Installation guide and help with deployment](https://www.ptbk.io/en/open-source)

### Start your first agenda

Create a folder for the work, then describe what it should achieve:

```sh
mkdir my-agenda
cd my-agenda
ptbk init
```

The initializer prepares Git, the project files, your selected harness and browser, then starts the agenda in the background. You choose the tools and sign in to the accounts it should use. The initial description is kept in `specs/_initial.md`.

Open the controls and talk to your agents:

```sh
ptbk dashboard
ptbk chat
```

The dashboard and chat are separate commands; close one before running the next in the same terminal, or use another terminal. Leaving the dashboard keeps the engine running.

```sh
ptbk stop           # finish the current task, then stop
ptbk start          # resume this project's ongoing agenda
ptbk help           # command reference
ptbk about          # product information and your installed engine version
```

Configure a real project check for work that needs automated validation. If none is supplied, init leaves an explicitly informational placeholder; it does not prove a result correct. For an existing project with a check script, you can provide it during initialization with `ptbk init --check "npm run check"`.

By default, the engine can recover after a crash and resume when you sign in after a reboot. Its browser dashboard is also published through a protected tunnel; a device must be paired from the trusted terminal before it can access the project. Use `ptbk init --no-tunnel` or `ptbk start --no-tunnel` for local-only dashboard access. See [remote access](specs/cli/remote-access.md) for pairing and revocation.

### Your project, in ordinary files

| Path | What you keep there |
| --- | --- |
| `agents/` | Lasting roles, goals, knowledge and rules in agent Books |
| `tasks/` | Concrete work and completion records in task Books |
| `chats/` | Conversations, questions and decisions |
| `specs/` | Project intent and specifications |
| `ptbk.json` | Project configuration and named tools |
| `traces/` | Task execution evidence; committed only if you choose |
| `.ptbk/` | Git-ignored runtime state |

Credentials and browser sessions stay outside versioned project content. Keep appropriate backups and access controls for the machine and any external services you connect.

## Build with us

If this is how you want AI to work, **[give Promptbook a star on GitHub](https://github.com/webgptorg/promptbook)**. Share a reproducible issue, contribute an improvement or build an agenda of your own.

Agencies, freelancers and integrators can [deploy Promptbook for their clients](https://www.ptbk.io/en/partnership), combining the application and engine with their own expertise and services. If you want help getting started, [tell us about your agenda](https://www.ptbk.io/en).

- [Specification](specs/_main.md) — intended behavior, including work not yet implemented
- [CLI reference](specs/cli/cli.md) — use `ptbk help` for the version you have installed
- [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md)

## License

Promptbook is licensed under the Business Source License 1.1 (BUSL-1.1). See [LICENSE.md](LICENSE.md).
