# Content: harness catalog

The single source of truth for the harness cards in the [Harnesses section](../sections/harnesses.md). One entry = one card, in this order.

Shared facts:

-   Harness identifiers are the exact values accepted by `--harness`.
-   Thinking levels (for harnesses that support them): `low`, `medium`, `high`, `xhigh`, `max`.
-   `--model` is optional for every harness. Execution uses the current flagship unless `PTBK_MODEL` or `--model` selects another model.
-   Runtime defaults and the landing page share [`HARNESS_DEFAULT_MODELS`](../../../../src/cli/cli-commands/common/harness/HARNESS_DEFAULT_MODELS.ts). Update that registry when a new flagship becomes available.
-   `--model default` keeps the native configuration for Codex, Copilot, Claude Code and OpenCode. Gemini, Qwen Code and Cline adapters resolve it to the flagship listed below.
-   Each card displays its automatic default and a sample command which works without `--model`.

| # | Harness id | Display name | Vendor | Automatic default | Other model examples | Accent color |
| - | ---------- | ------------ | ------ | ----------------- | -------------------- | ------------ |
| 1 | `claude-code` | Claude Code | Anthropic | `fable` | `opus`, `sonnet`, `haiku` | `#D97757` |
| 2 | `openai-codex` | OpenAI Codex | OpenAI | `gpt-6-astra` | `default` | `#FFFFFF` |
| 3 | `github-copilot` | GitHub Copilot CLI | GitHub | `gpt-6-astra` | `default` | `#8957E5` |
| 4 | `gemini` | Gemini CLI | Google | `gemini-3.8-flash` | `default` | `#4E82EE` |
| 5 | `qwen-code` | Qwen Code | Alibaba | `qwen3.8-max` | `default` | `#615CED` |
| 6 | `opencode` | opencode | opencode | `openai/gpt-6-astra` | `default` | `#F0F0F0` |
| 7 | `cline` | Cline | Cline Bot Inc. | `gemini-3.8-flash` | `default` | `#9038FF` |

## Descriptions (verbatim card copy)

1. **Claude Code** — "The agentic CLI by Anthropic. ptbk coder drives it through your whole prompt queue, with thinking levels up to max."
2. **OpenAI Codex** — "The OpenAI Codex CLI. Automatically uses the current flagship. Use --model default to keep your Codex configuration, and --allow-credits to opt into spending beyond your rate limits."
3. **GitHub Copilot CLI** — "GitHub Copilot in your terminal. Works out of the box with your Copilot subscription and supports thinking levels."
4. **Gemini CLI** — "The Google Gemini CLI. Automatically selects the latest Gemini model for coding and agent tasks."
5. **Qwen Code** — "The Qwen Code CLI. Defaults to the current Qwen Max model and signs in with a Qwen account or an OpenAI-compatible API key."
6. **opencode** — "The open-source terminal coding agent. Defaults to the OpenAI flagship through your configured OpenAI provider. Use --model default to keep your own provider and model."
7. **Cline** — "The Cline CLI agent. The Google provider integration defaults to the latest Gemini coding model."

## Sample command per card

| Harness | Sample command |
| ------- | -------------- |
| `claude-code` | `ptbk coder run --harness claude-code --thinking-level max` |
| `openai-codex` | `ptbk coder run --harness openai-codex` |
| `github-copilot` | `ptbk coder run --harness github-copilot --thinking-level xhigh` |
| `gemini` | `ptbk coder run --harness gemini` |
| `qwen-code` | `ptbk coder run --harness qwen-code` |
| `opencode` | `ptbk coder run --harness opencode` |
| `cline` | `ptbk coder run --harness cline` |

## Logos

Each card shows a **simple original inline-SVG mark** (28px stroke drawing on a 48px rounded dark tile) evoking the product in its accent color — *not* the official vendor logo, so no third-party brand assets ship with the page:

-   `claude-code`: 8-ray starburst (4 crossing lines)
-   `openai-codex`: hexagon with a circle inside
-   `github-copilot`: two rounded goggle lenses joined by a bridge
-   `gemini`: four-point spark with concave edges
-   `qwen-code`: `Q` mark — a circle with a tail
-   `opencode`: terminal prompt `>` with an underscore
-   `cline`: robot head (rounded rect, antenna, two dot eyes)

If official logo licensing is later cleared, marks may be swapped for official assets without any other change to the card layout.
