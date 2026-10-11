# Compatibility and verification

The package implements the command surface in [the specification](https://github.com/webgptorg/promptbook/blob/main/specs/_main.md). The command root is `ptbk`; historical `ptbk coder` invocations receive a migration diagnostic. Initialization updates only recognized generated callers and preserves custom scripts and workflows.

| Area | Behavior |
| --- | --- |
| Package | Only root `ptbk` is publishable. The compiled ESM boundary is private; `qrcode` is the runtime dependency for startup QR output. |
| Installation | Global links, local links, npm scripts and offline local `npm exec` use the installation's runtime/version. Restart configuration pins its executable and worker. |
| Tasks | Modern TASK Books, Markdown checkmarks, recurring occurrences, prerequisites, parents, priorities, origin metadata and deterministic migration. |
| Agents | Normalized recursive discovery, hidden agents, inheritance/imports, core Adam/Manager/Teacher, Expert/User/Void, bounded TEAM consultations and OPEN/CLOSED learning. |
| Execution | Finite runs, continuous supervision, checked single-result commits, worktree isolation, scoped staging and recovery journals. |
| Controls | Shared terminal, authenticated local socket and localhost HTTP controls; durable questions and answers also work without HTTP. |
| Browser | Chrome/Chromium CDP tools with a persistent profile and exclusive ownership; explicit human-action requests handle login and 2FA. |
| Persistence | Current-user systemd, launchd or Windows Task Scheduler registrations. Missing OS/session prerequisites fail with a diagnostic. |
| Harnesses | Codex, Claude Code, Gemini CLI, Qwen Code, GitHub Copilot, Cline and OpenCode adapters; native protocol/capability checks precede inference and read-only tools are constrained. |
| Release | npm version hooks, atomic branch/tag push, tag validation, GitHub Actions OIDC/provenance publication and bounded public-registry verification. |

Deterministic tests exercise provider substitutes, task execution, checks, hooks, signing/staging boundaries, retries, interruption, recovery, isolation, dashboard authorization, planning and package installation. Browser tests use a local Chrome executable when available and skip explicitly otherwise. Startup registration formats are tested without changing the developer machine's login services.

The CI matrix checks Linux, macOS and Windows on Node 22/24. A passing local test run does not establish successful paid inference for every provider/account or a physical reboot on each operating system. Provider CLI changes are detected through capability and protocol validation; incompatible versions require updating the adapter or installed CLI. Model catalogs or usage data are reported as unknown when the provider does not expose them.

Account-level npm trusted-publisher configuration remains an external prerequisite; see [release setup](releasing.md).
