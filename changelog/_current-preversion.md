# Unreleased

## Reborn `ptbk` implementation

-   The repository publishes exactly one npm package, `ptbk`, installing the `ptbk` CLI (global or project-local).
-   Fresh implementation from [the specification](../specs/_main.md):
    -   Book language parser (agents and tasks), four-tier agent resolution, inheritance, IMPORT/DELETE, learning policy.
    -   Task Books and Markdown tasks, eligibility, priorities, dependencies, earliest start, recurrence.
    -   Harness plugins: OpenAI Codex, Claude Code, GitHub Copilot, Cline, OpenCode, Gemini CLI, Qwen Code (featured/More catalog).
    -   Execution lifecycle with checks, repair budgets, single `PTBK: <task title>` result commits, Manager assignment, Teacher learning, goal discovery, user requests via the ptbk MCP bridge (TEAM consultations), recovery.
    -   `init` wizard and unattended flags, `start`/`stop`/`restart` daemon with supervisor and OS startup persistence, foreground mode, finite `run`.
    -   Live terminal dashboard, shared status view, lightweight browser SPA and authenticated HTTP API (pairing, sessions, API tokens, CSRF), Cloudflare tunnel management.
    -   Shared project browser (Chrome via CDP) with agent tools.
    -   Commands: `add`, `answer`, `list`, `plan`, `fix`, `verify`, `migrate`, `recover`, `lint`, `access`, `ping`, finders and boilerplates.
-   Release flow: `npm version …` runs basic checks in `preversion` and pushes the version commit and tag in `postversion`; GitHub Actions (**Check ptbk**, **Publish ptbk**) validate and publish.
