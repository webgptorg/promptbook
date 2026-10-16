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

## Autonomous initialization and task audit trails

-   `ptbk init` is intent-first: the first question asks what you are working on, using a rich composer (multiline text, compact `[Pasted text #n, N lines]` tokens, `[Image #n]`/`[File: …]` attachments via drag-and-drop paths, Ctrl+O and clipboard images with Ctrl+V; tokens can be inspected, expanded with Ctrl+T or removed). The input is preserved verbatim in `specs/_initial.md` with project-local attachments in `specs/_initial/`; noninteractive equivalents are `--intent`, `--intent-file` and repeatable `--attach`.
-   Init saves one ordinary Expert task (`TASK AGENT @Expert`) linking the initial specification (a readiness review for blank intent) instead of a generic starter, commits setup with its `Task-ID`, then automatically performs the ordinary background start (explicit overrides such as `--no-commit`, `--no-tunnel`, `--port` and `--no-persist` carry over; `--no-start` only prepares). It never executes the task inline and returns immediately; `ptbk dashboard` is the primary next step. Repeated init reuses a running service; an explicit init also resumes an intentionally stopped one.
-   Wizard experience: truthful `Step X of Y` that updates when the path changes, Expert as the visible procedural guide, Esc goes back (drafts survive), Ctrl+C cancels, a dedicated **Traces** screen, and a brief celebration after confirmed success (static with `PTBK_REDUCED_MOTION`, none in raw output). An engine self-update keeps the accepted intent and attachments as a draft for the rerun.
-   Stable task IDs: every new task gets one (add, plan, verify, finders, Manager, Teacher, discovery, follow-ups written by agents); legacy tasks receive theirs in a scoped `PTBK: Assign task ID - …` commit before execution, never during list/dry-run. Markdown sections carry `<!-- ptbk-task-id: … -->`; duplicates (case-insensitive) and path-unsafe IDs are errors; copied IDs in new follow-ups are replaced; migration preserves IDs.
-   Commits carry `Task-ID` trailers (plus `Created-Task-ID`/`Related-Task-ID` for follow-ups and assignment targets) on creation, assignment, preparation, result, failure and setup commits.
-   Per-task audit trails in root-level `traces/<task-id>/`: consolidated readable harness output for every attempt, occurrence, TEAM consultation and check (`harness.log`), task events (`events.jsonl`), post-commit events (`local/`), and browser recordings (`video/`, status in `video.json`) with page transitions, secret-entry/sign-in gaps and MP4 (via ffmpeg) or dependency-free Motion-JPEG MOV. Trace settings `traces.commit`, `traces.ignoreVideos`, `traces.recordVideo` drive a managed `.gitignore` block; committed traces share the task's result commit. Trace snapshots are never agent definitions. `ptbk list <task>` shows a task's trace, video and commits.
-   Unattended operation: a task waiting for a person (question or failure decision) is checkpointed and independent work continues when it holds no uncommitted changes (otherwise the wait is shown as a project-wide blocker); an answer resumes it automatically. Duplicate requests are merged and record what was already attempted. Agents are told not to ask for routine confirmation. Harness subprocesses that stay silent (`execution.stallTimeout`, default 45m) or silently wait on a terminal prompt are stopped and retried. Codex runs pre-approve ptbk's own MCP tools (`default_tools_approval_mode="approve"`), so `ask_user` and browser tools are no longer rejected as "approval unavailable".

## Agent references

-   Specification: agent references are `@Name` for single-word names and `{Multi Word Name}` for multiword names (`@Adam` and `{Adam}` are the same), used everywhere including `FROM @Void`, `FROM @Expert` and `FROM @Developer`; the resolution order (built-ins `@Void`/`@Null`/`@Expert`/`@User`, then `agents/`, the rest of the project, then Git-ignored content such as `node_modules`) is illustrated with example Books. Bare names in FROM stay accepted for compatibility.
-   Supplied core Books use the `@` form: Adam is `FROM @Void` and now ends with `CLOSED`; Teacher is `FROM @Expert`. The default Developer consults `@Expert` when writing `book` language. Existing projects' core Books are not rewritten.
