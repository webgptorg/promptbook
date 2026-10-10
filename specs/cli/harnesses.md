# Coding harnesses

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Preserve the adapters `openai-codex`, `claude-code`, `github-copilot`, `cline`, `opencode`, `gemini`, `qwen-code`. They share a typed request/result and lifecycle; provider CLI syntax, availability, login, versions, event parsing, usage and quota detection belong to the adapter.

Results must distinguish success, configuration refusal, missing login, quota/credit limits, transient errors, process crashes and cancellation. Capture exit code and signal/spawn failure. A successful final sentence from the model does not replace an exit/check outcome.

**Correction of an identified risk:** the current `runScriptUntilMarkerIdle` path allows success when `code === 0 || markerSeen`, although a Codex marker may be a usage summary or the end of a failed turn. In the new implementation, terminal failure, a signal and nonzero exit take precedence. Neither `tokens used` nor `turn.failed` proves success; a completion marker only controls waiting for trailing output. This conclusion comes from source analysis rather than a live reproduction.

| Harness | Existing CLI executable | Adapter requirement |
| --- | --- | --- |
| OpenAI Codex | `codex` | JSON and plain streams, reasoning, auth attribution and credit/limit detection. |
| Claude Code | `claude` | Streamed messages, effort, usage and resumption of the same session after a confirmed limit. |
| GitHub Copilot | `copilot` | Model/effort and structured output or a labeled fallback. |
| Gemini | `gemini` | Model and usage; unattended execution policy. |
| Qwen Code | `qwen` | Model and usage; unattended execution policy. |
| OpenCode | `opencode` | Provider-qualified model and JSON events. |
| Cline | `cline` | Provider/model configuration without contaminating user settings. |

Do not hardcode models in the task engine. Preserve the distinction for `--model default`: for Codex, Copilot, Claude and OpenCode, it may mean native configuration; Gemini, Qwen and Cline translate it to the registry default under the current policy. Always record the effective selection in the trace or explicitly acknowledge that the provider did not report it.

A missing login must exit with concrete instructions for the selected harness. Repeated retries must not consume more runs in place of authentication. Tool installation/update may occur only during authorized execution setup, never for list/help/dry-run. Do not install all providers preemptively.

For Codex, preserve the preference for an active ChatGPT login; the API-key path is explicit opt-in via `PTBK_OPENAI_CODEX_USE_API_KEY=1`, with an available key and no active account session. The trace distinguishes account/API/unknown; automatic fallback to a paid API is prohibited. The adapter validates specific provider invocation flags against the supported version.

## Related specifications

- [Agent Books and context](agent-context.md)
- [TEAM consultations](team.md)
- [Read-only planning](planning.md)
- [Attempts, retries and provider limits](retries.md)
- [Traces and results](traces.md)
