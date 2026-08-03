# Content: canonical commands

The single source of truth for every shell command shown on the page. Any section rendering a command **must** use one of these values verbatim — never a re-typed variant.

| Name                      | Command                                                                                                                                                                                                | Shown in                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `INSTALL_COMMAND`         | `npm install ptbk`                                                                                                                                                                                     | [Hero](../sections/hero.md), [Quickstart step 1](../sections/quickstart.md) |
| `INSTALL_GLOBAL_COMMAND`  | `npm install --global ptbk`                                                                                                                                                                            | (available alternative; may be mentioned in prose)                          |
| `INIT_COMMAND`            | `ptbk coder init`                                                                                                                                                                                      | [Quickstart step 2](../sections/quickstart.md)                              |
| `ADD_COMMAND`             | `ptbk coder add "Add a dark mode toggle to the settings page"`                                                                                                                                         | [Quickstart step 3](../sections/quickstart.md)                              |
| `RUN_COMMAND`             | `ptbk coder run --harness claude-code`                                                                                                                                                                 | [Quickstart step 4](../sections/quickstart.md)                              |
| `MODEL_FILTER_COMMAND`    | `ptbk coder run --harness github-copilot --model gpt-5.5`                                                                                                                                              | [Advanced features](../sections/advanced-features.md)                       |
| `TEST_BEFORE_FIX_COMMAND` | `ptbk coder run --harness claude-code --test npm test --test-before yes-and-fix`                                                                                                                       | [Advanced features](../sections/advanced-features.md)                       |
| `DRY_RUN_COMMAND`         | `ptbk coder run --dry-run`                                                                                                                                                                             | [Advanced features](../sections/advanced-features.md)                       |
| `SERVER_COMMAND`          | `ptbk coder server --harness claude-code --model fable --thinking-level max --agent agents/developer.book --context AGENTS.md --test npm run test`                                                     | [Quickstart step 5](../sections/quickstart.md)                              |
| `LIVE_DEMO_RUN_COMMAND`   | `ptbk coder run --harness claude-code --model fable --thinking-level xhigh --agent agents/developer.book --context AGENTS.md --test "npm run test-for-ptbk-coder" --wait-between-prompts 4h --limit 1` | Typed in the [live terminal](../components/live-terminal.md)                |
| `AGENT_RUN_COMMAND`       | `ptbk coder run --harness claude-code --model fable --agent agents/developer.book --context AGENTS.md`                                                                                                 | [Agent personas](../sections/agent-book.md)                                 |
| `VERIFY_COMMAND`          | `ptbk coder verify`                                                                                                                                                                                    | [Advanced features](../sections/advanced-features.md)                       |

Per-harness sample commands are defined in [`harness-catalog.md`](./harness-catalog.md); per-feature snippets in [`../sections/advanced-features.md`](../sections/advanced-features.md).

## Option reference (context for copywriting)

These `ptbk coder` options may be referenced in page prose and must be described accurately:

-   `--harness <name>` — selects the coding agent; one of the six harnesses in [`harness-catalog.md`](./harness-catalog.md). Required for non-dry runs.
-   `--model <model>` — model passed to the harness; **required** for `openai-codex` and `gemini`.
-   Prompt routing — add one or more backtick-delimited model, model-family, or harness names to a ready `[ ]` status line, for example ``[ ] use model `gpt-5.5` ``; the prompt runs only when the selected harness or model matches after normalization, while `!` markers can appear before or after the token.
-   `--thinking-level <level>` — reasoning effort for supported harnesses: `low`, `medium`, `high`, `xhigh`, `max`.
-   `--agent <path.book>` — a `.book` file whose compiled system message is prepended to each coding prompt.
-   `--context <text-or-file>` — extra instructions inline or from a project file (e.g. `AGENTS.md`).
-   `--test <command...>` — verification command run after each prompt; failures are fed back and retried.
-   `--test-before <no|yes-and-fail|yes-and-fix>` — run the test command before coding; stop on pre-existing failures or create one repair prompt, and use `npm test` when no `--test` command is provided.
-   `--dry-run` — print unwritten prompts without executing.
-   `--min-priority <n>`, `--max-priority <n>` — for `run`, process only prompts within the inclusive priority range; `--priority <n>` remains an alias for `--min-priority`; for `add`, `--priority <n>` sets the priority of the new prompt (rendered as trailing `!` markers).
-   `--limit <n>` — stop after N prompt runs (`run` only).
-   `--no-auto` — wait for user confirmation before each prompt.
-   `--no-commit`, `--ignore-git-changes`, `--auto-push`, `--auto-pull` — git behavior switches.
-   `--isolate` — `run` only; implement each prompt in its own temporary git worktree (`.promptbook/coder-isolation-worktrees/<task-name>` on branch `ptbk-coder-isolation/<task-name>`) with its own copy of `.env`. A verified task is merged back into the current branch as one commit and the worktree is deleted; a task that cannot be merged is marked `[!]`, the failure is committed, and its worktree is kept for a manual merge while the coder continues. Because the worktree nests the whole repository one level deeper, git long path support is enabled for the isolated run so that Windows `MAX_PATH` does not break the checkout. Cannot be combined with `--no-commit`.
-   `--wait-after-prompt`, `--wait-between-prompts`, `--wait-after-error <duration>` — wall-clock pacing; durations like `1h`, `30m`, `5s`; pause and computer sleep count against the wait; `S` skips the active wait; errors retry up to 3 times (default wait `10m`).
-   `--no-ui`, `--preserve-logs` — plain streaming output / keep temp artifacts.
-   `--port <port>` — `server` only; kanban UI port, default `4441`.

Environment variables that may be mentioned: `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` (agent git identity, created by `ptbk coder init` in `.env`), and `PTBK_HARNESS` / `PTBK_MODEL` / `PTBK_THINKING_LEVEL` as defaults for the corresponding options.
