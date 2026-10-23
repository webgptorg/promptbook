# Promptbook (`ptbk`)

Promptbook is a command-line utility that runs AI coding agents over a Git project. Agents, tasks and chats are plain-text files called Books. A background service works on one task at a time through a coding-agent CLI you choose, runs the project's check on each result and commits every accepted result to Git. When an agent needs a decision from you, it asks in a chat.

This repository publishes one npm package, [`ptbk`](https://www.npmjs.com/package/ptbk), which installs the `ptbk` command.

## Requirements

-   Node.js `^22.13.0` or `>=24`, npm 10 or newer, and Git.
-   An account for at least one supported coding-agent CLI (a _harness_): OpenAI Codex, Claude Code, GitHub Copilot, Cline, OpenCode, Gemini CLI or Qwen Code. `ptbk init` can install a missing one and start its login.
-   Google Chrome, Chromium or Microsoft Edge for the project browser.

## Installation

```bash
npm install --global ptbk
ptbk --version
```

On Windows, each [GitHub release](https://github.com/webgptorg/promptbook/releases) also includes `Promptbook-Setup-<version>-windows-x64.exe`. It installs any missing Node.js, npm and Git, installs `ptbk` and runs `ptbk init` in a new project folder.

## Quick start

```bash
mkdir my-project && cd my-project
ptbk init                         # describe what you are working on, then answer a few setup questions
ptbk dashboard                    # watch and control the service; Q leaves the dashboard, the service keeps running
ptbk chat                         # talk with the project's agents
ptbk answer                       # answer an agent that is waiting for you
ptbk add "Export reports as CSV"  # create and commit a new task
ptbk stop                         # let the current task finish, then stop
ptbk start                        # start again, also in a cloned project
```

`ptbk init` saves your description verbatim in `specs/_initial.md`. It then sets up Git, `ptbk.json`, the agents and your chosen harness and browser. It commits the setup, saves a first task that develops the project from your description and starts the service in the background. If the project has no check command, init saves a placeholder that validates nothing; pass a real one to init with `--check <command>`. By default, init also adds `ptbk` to the project's dependencies.

Until you run `ptbk stop`, the service restarts after a crash and when you sign in after a reboot. By default it also serves a browser dashboard on a local port and publishes it through a protected tunnel for phone access. A device can see or control the project only after you pair it from your terminal (`ptbk access pair`). Start with `--no-tunnel` to keep the dashboard local.

`ptbk help` lists all commands, and `ptbk help <command>` shows a command's options, defaults and examples.

## Project files

| Path        | Content                                                          |
| ----------- | ---------------------------------------------------------------- |
| `agents/`   | Agent Books: lasting roles, goals and rules                      |
| `tasks/`    | Task Books: bounded pieces of work                               |
| `chats/`    | Conversations between you and the agents                         |
| `ptbk.json` | Configuration, including the named browser and harness tools     |
| `traces/`   | Evidence for each task; Git-ignored unless you choose otherwise  |
| `.ptbk/`    | Git-ignored runtime state                                        |

## Documentation

The [specification](specs/_main.md) describes intended behavior, and some of it may not be implemented yet. `ptbk help` describes the version you have installed.

-   [Dictionary of terms](specs/dictionary.md)
-   [Book language](specs/book-language/_index.md)
-   [Commands](specs/cli/cli.md)
-   [Changelog](CHANGELOG.md), [contributing](CONTRIBUTING.md) and [security policy](SECURITY.md)

## License

Promptbook is licensed under the Business Source License 1.1 (BUSL-1.1). See [LICENSE.md](LICENSE.md).
