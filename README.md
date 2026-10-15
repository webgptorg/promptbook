# Promptbook (`ptbk`)

Promptbook operates readable **agents** and **tasks** over a Git project. Agents are Books with lasting roles, goals and rules; tasks are bounded work. Once started, the agenda runs unattended: it executes one task at a time, routes unassigned tasks through Manager, verifies every result with your project check and commits it together with its completion record (`PTBK: <task title>` plus a `Task-ID` trailer). When the backlog is empty, agents with goals are asked whether new work is useful. You are asked only when something genuinely needs a person.

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
ptbk init                 # describe your project, answer a few setup questions; the agenda then starts in the background
ptbk dashboard            # live terminal view and controls (Q leaves, the service keeps running)
ptbk status               # one snapshot: requests, current work, queue, connection
ptbk add "Improve CSV export"   # creates and commits a task (with its Task-ID); Manager assigns it
ptbk list "#<task-id>"    # one task: its trace, browser video and commits
ptbk answer               # answer questions agents asked you
ptbk stop                 # stop (stays stopped after reboot until the next start or init)
ptbk start                # start an initialized, cloned or stopped project
ptbk run --limit 1        # finite run with one agent/harness configuration
```

`ptbk init` first asks what you are working on — free text, long pasted material, images or other files (Ctrl+O attaches a file, Ctrl+V pastes a clipboard image, long pastes become compact `[Pasted text #1, 120 lines]` tokens). Your input is saved verbatim in `specs/_initial.md` (attachments in `specs/_initial/`), and one ordinary task assigned to the engine-supplied Expert transforms the project according to it. Init shows `Step X of Y`, never runs that task itself, starts the background agenda and returns; a blank intent gives a small skeleton whose first task is a readiness review.

Run `ptbk help` for all commands and `ptbk help <command>` for one command's options, defaults and examples.

-   **Unattended setup:** `ptbk init --non-interactive --installation local --harness openai-codex --check "npm test" --intent-file brief.md --attach mockup.png` (`--no-start` only prepares the project).
-   **Harnesses:** OpenAI Codex and Claude Code are featured; GitHub Copilot, Cline, OpenCode, Gemini CLI and Qwen Code are also supported. They are installed globally and use their own login.
-   **Files:** agents in `agents/` (core Adam, Manager and Teacher in `agents/.core/`), tasks in `tasks/` (Books or Markdown), specifications in `specs/`, per-task audit evidence in `traces/<task-id>/`, configuration in `ptbk.json`, runtime state in the Git-ignored `.ptbk/`.
-   **Task IDs and traces:** every task has a stable ID (`TASK ID` in Books, `<!-- ptbk-task-id: … -->` in Markdown sections) that also appears in its commits' `Task-ID` trailer and names `traces/<task-id>/`: the consolidated harness output (`harness.log`), events (`events.jsonl`) and, when the task used the project browser, its video (`video/`, sign-in steps excluded). `ptbk.json` `traces.commit` (default off: `traces/` is ignored), `traces.ignoreVideos` (default on) and `traces.recordVideo` (default on) are chosen on init's Traces screen. With `ffmpeg` on PATH videos are H.264 MP4, otherwise Motion-JPEG MOV.
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
