# Promptbook (`ptbk`)

Promptbook operates readable **agents** and **tasks** over a Git project. Agents are Books with lasting roles, goals and rules; tasks are bounded work. The agenda executes one task at a time, routes unassigned tasks through Manager, verifies every result with your project check and commits it together with its completion record (`PTBK: <task title>`). When the backlog is empty, agents with goals are asked whether new work is useful.

This repository publishes exactly one npm package, `ptbk`, which installs the `ptbk` command. It requires Node.js 22.13+ (Node 22 line) or 24+, npm 10+ and Git.

## Install

```bash
# Global
npm install --global ptbk

# Or project-local (no PATH entry; use npx or npm scripts)
npm install --save-dev ptbk
npx ptbk --version
```

Global and local installations are independent; every project keeps using the installation that started it, including after restarts.

## Use

```bash
ptbk init                 # wizard: destination, harnesses, browser, project check, first task
ptbk start                # background agenda + local dashboard + protected remote access
ptbk dashboard            # live terminal view and controls (Q leaves, the service keeps running)
ptbk status               # one snapshot: requests, current work, queue, connection
ptbk add "Improve CSV export"   # creates and commits a task; Manager assigns it
ptbk answer               # answer questions agents asked you
ptbk stop                 # stop (stays stopped after reboot until the next start)
ptbk run --limit 1        # finite run with one agent/harness configuration
```

Run `ptbk help` for all commands and `ptbk help <command>` for one command's options, defaults and examples.

-   **Unattended setup:** `ptbk init --non-interactive --installation local --harness openai-codex --check "npm test"`.
-   **Harnesses:** OpenAI Codex and Claude Code are featured; GitHub Copilot, Cline, OpenCode, Gemini CLI and Qwen Code are also supported. They are installed globally and use their own login.
-   **Files:** agents in `agents/` (core Adam, Manager and Teacher in `agents/.core/`), tasks in `tasks/` (Books or Markdown), configuration in `ptbk.json`, runtime state in the Git-ignored `.ptbk/`.
-   **Remote access:** `ptbk start` serves a dashboard on `127.0.0.1` and publishes it through a Cloudflare quick tunnel; devices must pair with a single-use link shown in the local terminal (`ptbk access pair`). Use `--no-tunnel` for local-only access or `--no-server` for neither.
-   **Presentation:** pretty terminal UI by default; `--raw` (or redirected output) gives plain text without prompts. `--non-interactive` never asks questions.
-   **Commits:** every mutating workflow commits its own changes with a `PTBK: ` subject; `--no-commit` is the explicit exception.

The behavior is defined by [the specification](specs/_main.md).

## Develop

```bash
npm ci
npm run check        # typecheck, tests with a fake harness, packed local/global installation checks
npm run ptbk -- --help
```

## Release

From a clean, committed, named branch:

```bash
npm version prerelease    # or patch / minor / major
```

`preversion` verifies the clean branch, typechecks, runs the tests and validates the manifest/lockfile. `postversion` atomically pushes the version commit and its `vX.Y.Z` tag. GitHub Actions then runs **Check ptbk** on Node 22/24 × Linux/macOS/Windows for the tag and, only if it passes, **Publish ptbk** publishes the single `ptbk` package with npm provenance and verifies the public registry and default local/global installations. Publishing needs the `NPM_TOKEN` secret or npm trusted publishing configured for this repository.

## License

See [LICENSE.md](LICENSE.md).
