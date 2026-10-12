# Harness selection, setup and execution

[Main specification](../_main.md)

A harness provides model/tool execution, not agent identity or the project's browser session. Support integrations for `openai-codex`, `claude-code`, `github-copilot`, `cline`, `opencode`, `gemini` and `qwen-code` through the common [plugin contract](harness-plugins.md).

## Project choices, global installations

The project's `ptbk.json` selects enabled harnesses and their non-secret configuration, including native global setup or references to API-key/model settings. CLI overrides follow [configuration precedence](configuration.md). Supported, installed, selected and usable are different states: installation alone does not enable a harness for a project.

Harness CLIs are installed globally in the user's system environment, never as project-local copies under `.ptbk/` or project dependencies. Discover the selected installations, authentication, versions, models and effective capabilities. Reuse existing native configuration and active login; do not rerun setup when already ready. Installed but signed-out is not usable.

Whenever setup is needed, offer the [featured/More selector](harness-plugins.md). The user may choose just one or several harnesses and defer others. Install, configure or guide login only for chosen integrations and only for missing prerequisites. Start routes only among enabled, usable harnesses; absent readiness invokes setup when interactive or reports an actionable unattended requirement. Read-only commands never perform setup or updates.

Native harness authentication remains separate from [browser profile selection](browser.md), even if the harness opens its own login page. Never transfer project browser cookies to a harness or store its account secrets in versioned configuration.

## Execution and permissions

Run the selected global harness over the project with effective instructions in autonomous exec mode. Respect explicit task restrictions, supported models/thinking settings and consultation capabilities; do not silently substitute unsupported requirements. Recheck readiness when conditions change and use [harness updates](harness-updates.md).

Record actual success, failure, missing login, quota, cancellation and effective model/effort. Completion-looking text cannot override a failed process/turn. Unknown provider information remains unknown; model catalogs come from integrations, not fixed examples in this specification.

For Codex, prefer an active account login. API-key execution requires `PTBK_OPENAI_CODEX_USE_API_KEY=1` and an available key when no active account session is used; credit usage requires `--allow-credits`. Automatic routing never authorizes an unapproved paid-account fallback. See [Manager](../agents/manager.md), [TEAM](team.md), [retries](retries.md) and [planning](planning.md).
