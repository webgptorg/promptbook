# Content: canonical commands

The single source of truth for every shell command shown on the page. Any section rendering a command **must** use one of these values verbatim — never a re-typed variant.

| Name                     | Command                                                                                                                                                                                                | Shown in                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `INSTALL_COMMAND`        | `npm install ptbk`                                                                                                                                                                                     | [Hero](../sections/hero.md), [Quickstart step 1](../sections/quickstart.md) |
| `INSTALL_GLOBAL_COMMAND` | `npm install --global ptbk`                                                                                                                                                                            | (available alternative; may be mentioned in prose)                          |
| `INIT_COMMAND`           | `ptbk coder init`                                                                                                                                                                                      | [Quickstart step 2](../sections/quickstart.md)                              |
| `ADD_COMMAND`            | `ptbk coder add "Add a dark mode toggle to the settings page"`                                                                                                                                         | [Quickstart step 3](../sections/quickstart.md)                              |
| `RUN_COMMAND`            | `ptbk coder run --harness claude-code`                                                                                                                                                                 | [Quickstart step 4](../sections/quickstart.md)                              |
| `DRY_RUN_COMMAND`        | `ptbk coder run --dry-run`                                                                                                                                                                             | [Advanced features](../sections/advanced-features.md)                       |
| `SERVER_COMMAND`         | `ptbk coder server --harness claude-code --model fable --thinking-level max --agent agents/developer.book --context AGENTS.md --test npm run test`                                                     | [Quickstart step 5](../sections/quickstart.md)                              |
| `LIVE_DEMO_RUN_COMMAND`  | `ptbk coder run --harness claude-code --model fable --thinking-level xhigh --agent agents/developer.book --context AGENTS.md --test "npm run test-for-ptbk-coder" --wait-between-prompts 4h --limit 1` | Typed in the [live terminal](../components/live-terminal.md)                |
| `AGENT_RUN_COMMAND`      | `ptbk coder run --harness claude-code --model fable --agent agents/developer.book --context AGENTS.md`                                                                                                 | [Agent personas](../sections/agent-book.md)                                 |
| `VERIFY_COMMAND`         | `ptbk coder verify`                                                                                                                                                                                    | [Advanced features](../sections/advanced-features.md)                       |

Per-harness sample commands are defined in [`harness-catalog.md`](./harness-catalog.md); per-feature snippets in [`../sections/advanced-features.md`](../sections/advanced-features.md).

## Option reference (context for copywriting)

These `ptbk coder` options may be referenced in page prose and must be described accurately:

-   `--harness <name>` — selects the coding agent; one of the six harnesses in [`harness-catalog.md`](./harness-catalog.md). Required for non-dry runs.
-   `--model <model>` — model passed to the harness; **required** for `openai-codex` and `gemini`.
-   `--thinking-level <level>` — reasoning effort for supported harnesses: `low`, `medium`, `high`, `xhigh`, `max`.
-   `--agent <path.book>` — a `.book` file whose compiled system message is prepended to each coding prompt.
-   `--context <text-or-file>` — extra instructions inline or from a project file (e.g. `AGENTS.md`).
-   `--test <command...>` — verification command run after each prompt; failures are fed back and retried.
-   `--dry-run` — print unwritten prompts without executing.
-   `--priority <n>` — for `run` / `find-unwritten`, process only prompts with at least this priority; for `add`, set the priority of the new prompt (rendered as trailing `!` markers).
-   `--limit <n>` — stop after N prompt runs (`run` only).
-   `--no-auto` — wait for user confirmation before each prompt.
-   `--no-commit`, `--ignore-git-changes`, `--auto-push`, `--auto-pull` — git behavior switches.
-   `--wait-after-prompt`, `--wait-between-prompts`, `--wait-after-error <duration>` — wall-clock pacing; durations like `1h`, `30m`, `5s`; pause and computer sleep count against the wait; errors retry up to 3 times (default wait `10m`).
-   `--no-ui`, `--preserve-logs` — plain streaming output / keep temp artifacts.
-   `--port <port>` — `server` only; kanban UI port, default `4441`.

Environment variables that may be mentioned: `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` (agent git identity, created by `ptbk coder init` in `.env`), and `PTBK_HARNESS` / `PTBK_MODEL` / `PTBK_THINKING_LEVEL` as defaults for the corresponding options.
