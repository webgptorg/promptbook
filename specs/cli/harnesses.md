# Harness discovery and execution

[Main specification](../_main.md)

Support `openai-codex`, `claude-code`, `github-copilot`, `cline`, `opencode`, `gemini` and `qwen-code`. A harness provides model/tool execution; it is not an agent identity. Discover installed CLIs, authentication state, supported models and effective capabilities. Installed but signed-out is not usable.

Initialization installs supported harness CLIs globally and guides authentication. Start inspects all available harnesses, verifies that at least one is usable and, when needed, offers installation/login setup before unattended operation. Do not install or authenticate during read-only commands. Installation failures and unsupported environments need concrete diagnostics.

Make inventories visible in status, terminal and HTTP interfaces, alongside project agents. Recheck availability when relevant conditions change. Manager may choose among available, authorized tools and models, respecting explicit task restrictions and user preferences. Do not silently substitute an unavailable explicit requirement or invent support for thinking settings or consultation tools.

Record actual success, failure, missing login, quota, cancellation and effective model/effort. A completion-looking marker or usage summary cannot override a failed process/turn. Report unknown provider information as unknown. Model catalogs/defaults follow the installed adapters, not fixed example model names in this specification.

Keep account/credit permissions explicit. For Codex, prefer an active account login; API-key execution is explicitly enabled with `PTBK_OPENAI_CODEX_USE_API_KEY=1` and an available key when no active account session is used. Credit usage requires `--allow-credits`. Automatic routing is not permission for an unapproved paid-account fallback.

See [Manager](../agents/manager.md), [TEAM](team.md), [retries](retries.md) and [planning](planning.md).
