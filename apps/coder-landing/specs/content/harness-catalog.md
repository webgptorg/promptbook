# Content: harness catalog

The single source of truth for the harness cards in the [Harnesses section](../sections/harnesses.md). One entry = one card, in this order.

Shared facts:

-   Harness identifiers are the exact values accepted by `--harness`.
-   Thinking levels (for harnesses that support them): `low`, `medium`, `high`, `xhigh`, `max`.

| # | Harness id       | Display name       | Vendor          | Model required | Model examples                    | Accent color |
| - | ---------------- | ------------------ | --------------- | -------------- | --------------------------------- | ------------ |
| 1 | `claude-code`    | Claude Code        | Anthropic       | no             | `fable`, `opus`, `sonnet`, `haiku` | `#D97757`    |
| 2 | `openai-codex`   | OpenAI Codex       | OpenAI          | **yes**        | `gpt-5.2-codex`, `default`        | `#FFFFFF`    |
| 3 | `github-copilot` | GitHub Copilot CLI | GitHub          | no             | `gpt-5.4`                         | `#8957E5`    |
| 4 | `gemini`         | Gemini CLI         | Google          | **yes**        | `gemini-3-flash-preview`, `default` | `#4E82EE`  |
| 5 | `opencode`       | opencode           | opencode        | no             | — (uses harness config)           | `#F0F0F0`    |
| 6 | `cline`          | Cline              | Cline Bot Inc.  | no             | — (uses harness config)           | `#9038FF`    |

## Descriptions (verbatim card copy)

1. **Claude Code** — "The agentic CLI by Anthropic. ptbk coder drives it through your whole prompt queue, with thinking levels up to max."
2. **OpenAI Codex** — "The OpenAI Codex CLI. Requires an explicit model; spending credits beyond rate limits is an explicit opt-in via --allow-credits."
3. **GitHub Copilot CLI** — "GitHub Copilot in your terminal. Works out of the box with your Copilot subscription and supports thinking levels."
4. **Gemini CLI** — "The Google Gemini CLI. Requires an explicit model such as the fast flash previews."
5. **opencode** — "The open-source terminal coding agent. Bring any provider configured in your opencode installation."
6. **Cline** — "The Cline CLI agent. Uses the models configured in your Cline setup."

## Sample command per card

| Harness          | Sample command                                                                       |
| ---------------- | ------------------------------------------------------------------------------------ |
| `claude-code`    | `ptbk coder run --harness claude-code --model fable --thinking-level max`            |
| `openai-codex`   | `ptbk coder run --harness openai-codex --model gpt-5.2-codex`                        |
| `github-copilot` | `ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh`     |
| `gemini`         | `ptbk coder run --harness gemini --model gemini-3-flash-preview`                     |
| `opencode`       | `ptbk coder run --harness opencode`                                                  |
| `cline`          | `ptbk coder run --harness cline`                                                     |

## Logos

Each card shows a **simple original inline-SVG mark** (28px stroke drawing on a 48px rounded dark tile) evoking the product in its accent color — *not* the official vendor logo, so no third-party brand assets ship with the page:

-   `claude-code`: 8-ray starburst (4 crossing lines)
-   `openai-codex`: hexagon with a circle inside
-   `github-copilot`: two rounded goggle lenses joined by a bridge
-   `gemini`: four-point spark with concave edges
-   `opencode`: terminal prompt `>` with an underscore
-   `cline`: robot head (rounded rect, antenna, two dot eyes)

If official logo licensing is later cleared, marks may be swapped for official assets without any other change to the card layout.
