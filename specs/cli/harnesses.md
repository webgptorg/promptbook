# Harness selection, setup and execution

[Main specification](../_main.md)

A harness provides model/tool execution, not agent identity or the project's browser session. Support integrations for `openai-codex`, `claude-code`, `github-copilot`, `cline`, `opencode`, `gemini` and `qwen-code` through the common [plugin contract](harness-plugins.md).

## Project choices, global installations

The project's `ptbk.json` selects enabled harnesses and their non-secret configuration, including native global setup or references to API-key/model settings. CLI overrides follow [configuration precedence](configuration.md). Supported, installed, selected and usable are different states: installation alone does not enable a harness for a project.

Harness CLIs are installed globally in the user's system environment, never as project-local copies under `.ptbk/` or project dependencies. Discover the selected installations, authentication, versions, models and effective capabilities. Reuse existing native configuration and active login; do not rerun setup when already ready. Installed but signed-out is not usable.

Whenever setup is needed, offer the [featured/More selector](harness-plugins.md). The user may choose just one or several harnesses and leave others unselected. Install, configure or guide login only for chosen integrations and only for missing prerequisites. During init, finish and verify every selected integration: its executable and required configuration are available, authentication has actually completed and authorized autonomous execution is usable. Opening a login page or starting installation is not readiness. Do not leave a selected harness pending merely because another one works.

A failed, cancelled or deferred selected integration keeps init incomplete unless the user explicitly removes it from the selection; do not silently deselect it. At least one selected usable harness is necessary for ready-to-run completion, including a usable bootstrap choice for Manager. Recheck readiness after setup/update without an implicit paid test call. Start reuses that setup without asking again while it remains valid. Later missing prerequisites invoke setup when interactive or produce an actionable unattended requirement. Read-only commands never perform setup or updates.

Native harness authentication remains separate from [browser profile selection](browser.md), even if the harness opens its own login page. Never transfer project browser cookies to a harness or store its account secrets in versioned configuration.

## Execution and permissions

Run the selected global harness over the project with effective instructions in autonomous exec mode. Respect explicit task restrictions, supported models/thinking settings and consultation capabilities; do not silently substitute unsupported requirements. Recheck readiness when conditions change and use [harness updates](harness-updates.md).

Record actual success, failure, missing login, quota, cancellation and effective model/effort. Completion-looking text cannot override a failed process/turn. Unknown provider information remains unknown; model catalogs come from integrations, not fixed examples in this specification.

## Codex account login and billing

For Codex, prefer and reuse an active native ChatGPT account login. A successful `codex login status` reporting `Logged in using ChatGPT` is authentication evidence. With the executable and required execution capabilities available, init must accept this account as usable without another login, an API key or `--allow-credits`. Ordinary account/subscription execution, including TEAM and planning, must not require a credit-control flag absent from the installed Codex CLI. Readiness inspection uses login status, help and metadata, never an implicit model call.

Authentication, subscription availability, account credits and API billing are separate concerns. Account execution follows the user's existing native Codex/account billing controls. `--allow-credits` authorizes supported explicit paid-credit fallback; it is not required to reuse subscription access and never authorizes API billing. Apply native credit restrictions when the invoked command actually supports them. If no such control exists, do not invent flags/configuration or claim that ptbk guarantees credit-free execution. Users requiring a hard account-credit limit must configure it through the provider's supported account/workspace controls. See the official [authentication](https://learn.chatgpt.com/docs/auth), [CLI reference](https://learn.chatgpt.com/docs/cli/reference) and [pricing](https://learn.chatgpt.com/docs/pricing).

API-key execution requires `PTBK_OPENAI_CODEX_USE_API_KEY=1` and an available key when no active account session is used. An active account session wins even when keys are present; remove API-key environment overrides from its execution and force ChatGPT authentication. Quota or credit-limit failures remain quota outcomes, not signed-out/setup errors. Automatic routing never changes to an unapproved paid account or API fallback. See [Manager](../agents/manager.md), [TEAM](team.md), [retries](retries.md) and [planning](planning.md).
