# Promptbook (`ptbk`)

Promptbook operates readable **agents**, **tasks** and **chats** over a Git project. All three are Books in one language: each starts with `AGENT <name>`, `TASK <name>` or `CHAT <name>`, and that name is its identity. Agents have lasting roles, goals and rules; tasks are bounded work; chats are persistent conversations between you and an agent. Once started, the agenda runs unattended: it executes one task at a time, routes unassigned tasks through Manager, verifies every result with your project check and commits it together with its completion record (`PTBK: <task name>` plus a `Task-Name` trailer). When the backlog is empty, agents with goals are asked whether new work is useful; Fixer keeps the project itself healthy. When something genuinely needs a person, the responsible agent asks you in a chat.

This repository publishes exactly one npm package, `ptbk`, which installs the `ptbk` command. It requires Node.js 22.13+ (Node 22 line) or 24+, npm 10+ and Git.

## Install

```bash
# Global
npm install --global ptbk

# Or project-local (no PATH entry; use npx or npm scripts)
npm install --save-dev ptbk
npx ptbk --version
```

Global and local installations are independent; every project keeps using the installation that started it, including after restarts. A dashboard or status opened with another ptbk version shows the service through its own installation.

**Windows:** every release also ships `Promptbook-Setup-<version>-windows-x64.exe` on its [GitHub Release](https://github.com/webgptorg/promptbook/releases). It installs missing prerequisites (Node.js, npm, Git) from their official distributions, installs that exact `ptbk` version globally, creates an empty first-project folder in `%USERPROFILE%\Promptbook` and opens a terminal running `ptbk init` there. It is only a bootstrap: the project itself is set up by the ordinary `ptbk init`.

## Use

```bash
ptbk init                 # describe your project, answer a few setup questions; the agenda then starts in the background
ptbk dashboard            # live terminal view and controls (Q leaves, the service keeps running)
ptbk dashboard --global   # every running project engine on this computer, from any directory
ptbk status               # one snapshot: agents waiting for you, current work, tools, queue, connection
ptbk tool list            # the named browser and harness tools: enabled, usable, in use
ptbk chat                 # talk with Chatter (Enter) or choose another agent; Ctrl+C closes only the chat
ptbk ask "What is left?"  # quick question to one agent, saved as a chat
ptbk answer               # answer agents that wait for you
ptbk add "Improve CSV export"   # creates and commits a task; Manager assigns it
ptbk list "{{Improve CSV export — 2026-10-18 01:25:00}}"  # one task: its trace, browser video and commits
ptbk pause                # no new task starts; the current one finishes first (ptbk resume continues)
ptbk stop                 # graceful stop after the current task (stays stopped after reboot); -F stops now
ptbk restart              # graceful restart: exactly one replacement with the same configuration
ptbk start                # start an initialized, cloned or stopped project
ptbk run --limit 1        # finite run with one agent/harness configuration
```

`ptbk init` first asks what you are working on — free text, long pasted material, images or other files (Ctrl+O attaches a file, Ctrl+V pastes a clipboard image, long pastes become compact `[Pasted text #1, 120 lines]` tokens). Your input is saved verbatim in `specs/_initial.md` (attachments in `specs/_initial/`), and one ordinary task assigned to the engine-supplied Expert transforms the project according to it. Init shows `Step X of Y`, never runs that task itself, starts the background agenda and returns; a blank intent gives a small skeleton whose first task is a readiness review. Init does not ask for a check command: an existing real check is kept, otherwise `execution.check` gets an informational placeholder that always succeeds and never counts as passing tests (Expert can add real validation). It asks once whether to synchronize with a Git remote (default no; yes publishes to a new private GitHub repository through your GitHub CLI login, or to another origin URL).

Run `ptbk help` for all commands and `ptbk help <command>` for one command's options, defaults and examples.

-   **Unattended setup:** `ptbk init --non-interactive --installation local --harness openai-codex --check "npm test" --intent-file brief.md --attach mockup.png` (`--no-start` only prepares the project; `--auto-sync --github-repository me/project` or `--origin-url <url>` also publishes it).
-   **Tools:** browsers and harnesses are ordered named tools in `ptbk.json` `tools` — `BROWSER` (variants `CHROME`, `CHROMIUM`, `EDGE`; profile `MANAGED_GLOBAL`, `PROJECT`, `USER_EXISTING` or `CUSTOM`) and `HARNESS` (`OPENAI_CODEX`, `CLAUDE_CODE`, `GITHUB_COPILOT`, `CLINE`, `OPENCODE`, `GEMINI`, `QWEN_CODE`; authentication `NATIVE` or `API_KEY`). Init creates one browser and one native instance per selected harness; add more later — e.g. a second subscription or a paid API fallback (`ptbk tool add HARNESS --variant OPENAI_CODEX --name company-api --authentication API_KEY --api-key-env COMPANY_OPENAI_API_KEY --api-key-stdin`), or separate browser profiles for different accounts. Within one variant the first usable instance serves work and later ones are fallbacks (e.g. after a quota limit). API keys are stored only as `${{ env.NAME }}` references; values go to the Git-ignored `.env` with timestamped comments and are never deleted (replaced values stay commented out). Every `ptbk tool add|modify|enable|disable|remove|move` is committed at once, also while a task runs, and the running engine uses a new tool immediately — even in the current task. With no usable browser or harness the engine keeps running and waits for tools.
-   **Harnesses:** OpenAI Codex and Claude Code are featured; GitHub Copilot, Cline, OpenCode, Gemini CLI and Qwen Code are also supported. They are installed globally; native instances use their own login (ambient API keys never switch them to API billing).
-   **Files:** agents in `agents/` (core Adam, Manager, Teacher, Fixer and Chatter in `agents/.core/`), tasks in `tasks/` (Books or Markdown), chats in `chats/`, specifications in `specs/`, per-task audit evidence in `traces/<task-file-basename>/`, configuration in `ptbk.json`, runtime state in the Git-ignored `.ptbk/`.
-   **Books:** every Book opens with one declaration, then commitments, e.g.

    ```book
    TASK Improve CSV export — 2026-10-18 01:25:00
    GOAL Preserve column names and quote cells with commas or newlines.
    TASK AGENT @Developer
    LINK {{Discuss CSV requirements — 2026-10-18 01:24:00}}
    ```

    A commitment keyword is a complete line-initial uppercase word sequence of at least three letters (so a name must not begin with an all-uppercase word: `AGENT Ceo`, not `AGENT CEO`); descriptions go under commitments such as `GOAL`, `PERSONA` or `NOTE`. New tasks and chats get generated names — a readable title plus the creation date/time, distinct from every other name. Books in the former syntax (a plain name line, `ENTITY`) are reported and converted only by `ptbk migrate`.
-   **Names, references and traces:** `@Name` and `{{Multi Word Name}}` (the older `{Name}` still reads) reference any Book through one resolver: built-ins (`@Void`, `@Null`, `@Expert`, `@User`), then `agents/`, `tasks/`, `chats/`, the rest of the project and finally Git-ignored content; a same-name copy is shadowed and reported, never merged or renamed. Commits carry `Task-Name`/`Chat-Name` trailers and each task's evidence lives in `traces/<task-file-basename>/` — the task's source filename without `.book` (e.g. `tasks/2026-10-19-1205-browser-repair.book` → `traces/2026-10-19-1205-browser-repair/`), with the declared name and source revision recorded inside: the consolidated harness output (`harness.log`), events (`events.jsonl`) and, when the task used the project browser, its video (`video/`, sign-in steps excluded). `ptbk.json` `traces.isCommitted` (default off: `traces/` is ignored), `traces.isVideoIgnored` (default on) and `traces.isVideoRecordingEnabled` (default on) are chosen on init's Traces screen. With `ffmpeg` on PATH videos are H.264 MP4, otherwise Motion-JPEG MOV.
-   **Chats:** a new chat goes to **Chatter**, the project's conversational guide (Enter), unless you choose another agent; Chatter consults the right specialists for you (attributed, linked consultation chats) and creates ordinary tasks only when you ask for work. Every message you or an agent write is committed (`PTBK: Chat - <name>`); reading never commits. A correction in a chat can schedule an ordinary Teacher task. Questions, sign-in requests and failure decisions from running tasks are chats started by the responsible agent (dashboard key `A`, `ptbk answer`); the task resumes on a valid answer. The dashboards start chats with `C` (terminal) or **New chat** (browser).
-   **Browser:** each browser tool is one profile shared by the project's agents: the dedicated Promptbook profile shared by your projects (`MANAGED_GLOBAL`, default; one project at a time), an isolated project profile in `.ptbk/` (`PROJECT`), your own Chrome profile (`USER_EXISTING`), or a custom path (`CUSTOM`). Agents choose among several browsers by name and description (`browser_list`).
-   **Configuration:** `ptbk.json` records `promptbookVersion`, the engine version that initialized or last migrated it. A newer engine migrates an older configuration in one dedicated `PTBK: Migrate configuration from … to …` commit before new work (a configuration without the field is treated as `0.119.0-21`); an older engine refuses and offers its update instead of downgrading. Keys are lower camelCase, booleans start with `is`, tool names are kebab-case and fixed enum values are uppercase (`YES_AND_FIX`, `OPENAI_CODEX`); unambiguous spelling mistakes are corrected in a scoped commit, ambiguous ones are left for Fixer.
-   **Synchronization:** `isAutoSync` (default `false`) synchronizes with the repository's existing origin and the current branch: pull every minute and before work and commits (visible merge commits, never rebase or force-push), then push completed work. Failed pulls/pushes never stop local work; conflicts go to Fixer as ordinary work. The dashboards show a synchronization panel with **Synchronize now** only while it is enabled. `--auto-sync`/`--no-auto-sync` override it for one invocation (`--auto-pull`/`--auto-push` are compatibility aliases).
-   **Service lifecycle:** a running engine is `running`, `pausing`, `pause` or `stopping`. Pause and stop let the current task finish without starting another one; `ptbk resume` cancels a pending pause, stop or restart; `ptbk stop --force` (`-F`) interrupts owned work immediately (recoverable). The dashboards and browser expose the same controls; leaving a dashboard never stops the service, and any number of dashboards can watch one engine. Execution details (agent, harness tool, model, thinking level) and browser details (profile, health, recheck/retry/restart) are collapsible panels (`E`/`B` in the terminal); `T` manages tools (Space enables/disables, N adds, M modifies, `[`/`]` reorders, D removes) and, with synchronization on, `Y`/`G` show it and synchronize now.
-   **Remote access:** `ptbk start` serves a dashboard on `127.0.0.1` and publishes it through a Cloudflare quick tunnel; devices must pair with a single-use link shown in the local terminal (`ptbk access pair`). Use `--no-tunnel` for local-only access or `--no-server` for neither.
-   **Presentation:** pretty terminal UI by default; `--raw` (or redirected output) gives plain text without prompts. `--non-interactive` never asks questions. Interactive sessions name the terminal tab (`📖 Promptbook · <project> · Dashboard · <agent>: <task>`); `--no-terminal-title` or `PTBK_TERMINAL_TITLE=off` keeps your own title.
-   **Commits:** every mutating workflow commits its own changes with a `PTBK: ` subject; `--no-commit` is the explicit exception (never for configuration migrations or tool management).
-   **Fixer:** an ordinary editable core agent whose goal is to solve problems and reduce the decisions you need to make; its initial TEAM includes you and Expert, so it asks only when it genuinely needs help — edit its Book to require more consultation or none. When a task's agent cannot finish it, the running agenda first hands the task to Fixer (one bounded round, same result commit); you are asked how to continue only if Fixer cannot resolve it either. Merge conflicts of Git synchronization and of isolated (`--isolate`) results also go to Fixer as ordinary work.

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

`preversion` verifies the clean branch, typechecks, runs the tests and validates the manifest/lockfile. `postversion` atomically pushes the version commit and its `vX.Y.Z` tag. GitHub Actions then runs **Check ptbk** on Node 22/24 × Linux/macOS/Windows for the tag and, only if it passes, **Publish ptbk** publishes the single `ptbk` package with npm provenance and verifies the public registry and default local/global installations. Publishing needs the `NPM_TOKEN` secret or npm trusted publishing configured for this repository. After npm publication the same workflow builds the Windows installer from the tag (Inno Setup around `installer/windows/bootstrap.ps1`), checks that it installs and reports the published version, and attaches it with its SHA-256 checksum to the version's GitHub Release (an identical existing asset is reused, a different one is never overwritten; a missing installer leaves the release incomplete).

## License

See [LICENSE.md](LICENSE.md).
