# run-codex-prompts

`run-codex-prompts.ts` drives the Coding Agent workflow. It loads the `prompts/` tasks, runs them through the selected model runner (OpenAI, Gemini, Claude, etc.), and automatically writes, stages, commits, and optionally pushes the generated files.

## Usage

### Via Promptbook CLI (recommended):

```bash
# External usage (when promptbook is installed globally)
ptbk coder run --harness openai-codex --model gpt-5.2-codex

# Internal usage (within Promptbook repository)
npx ts-node ./src/cli/test/ptbk.ts coder run --harness openai-codex --model gpt-5.2-codex
```

### Direct execution (legacy):

```bash
npx ts-node ./scripts/run-codex-prompts/run-codex-prompts.ts --harness openai-codex --model gpt-5.2-codex
```

### Available options:

```bash
--dry-run                     # Print unwritten prompts without executing
--harness <harness-name>        # Select runner: openai-codex, github-copilot, cline, claude-code, opencode, gemini (required for non-dry-run)
--model <model>               # Model to use (required for openai-codex and gemini, optional for github-copilot and opencode)
--context <context-or-file>   # Append extra instructions inline or load them from a file in the current project
--test <test-command...>       # Run a verification command after each prompt and feed failures back for retries
--test-before <mode>           # no (default), yes-and-fail, or yes-and-fix; enabled modes default to npm test
--no-ui                       # Disable the rich terminal UI and stream plain console output instead
--thinking-level <level>      # Reasoning effort for OpenAI Codex and GitHub Copilot: low, medium, high, xhigh
--priority <minimum-priority> # Alias for --min-priority
--min-priority <minimum-priority> # Filter prompts by minimum priority level
--max-priority <maximum-priority> # Filter prompts by maximum priority level
--allow-credits               # Allow OpenAI Codex runner to spend credits when limits are exhausted
--isolate                     # Implement each prompt in its own temporary git worktree and merge it back when verified
--auto-push                  # Push each successful commit to the configured remote
--auto-migrate                # Run testing-server DB migrations after each successful prompt
--allow-destructive-auto-migrate # Override destructive SQL heuristic guard in auto-migrate mode
--no-auto                     # Wait for user confirmation before each prompt instead of running automatically
--wait-after-prompt <duration>    # Wait this long after each prompt finishes before starting the next prompt (default 0)
--wait-between-prompts <duration> # Pace prompts so each next prompt starts at least this long after the previous start (default 0)
--wait-after-error <duration>     # Wait this long before retrying after an error (up to 3 retries, default 10m)
--git-changes <mode>          # Dirty working tree: fail (default), ignore the changes, or continue the interrupted [^] prompt
--no-normalize-line-endings   # Disable per-round CRLF -> LF normalization for changed files
```

For `--harness openai-codex`, credits are opt-in. If Codex reports that credits are required and `--allow-credits` is not set, the runner fails fast with a rerun hint.

### Terminal controls

The `S` control is shown only while the coder is waiting; it is hidden while a prompt is running or after the run has finished.

```text
P  Pause  S  Skip current waiting  X  End with this prompt  CTRL+C  Exit
```

Press `X` again after requesting the dynamic end to continue the full current run.

Every press is answered right under the pills, so you never have to guess whether the key arrived:

```text
» S  Skipping the current waiting, continuing right now
» S  Nothing to skip, the coder is not waiting right now (×2)
```

The answer stays on screen for a few seconds and repeated identical answers are counted, so pressing the same control twice redraws the frame too. In `--no-ui` mode the very same line is printed to the console instead.

Whenever `S  Skip current waiting` is offered, the wait really ends on that key press: the `--wait-between-prompts` and `--wait-after-prompt` pacing, the `--wait-after-error` cool-down, the Claude Code session-limit wait before a `--resume` resurrection, and the `ptbk coder server` keep-alive poll.

### Examples:

```bash
# Dry run to preview prompts
ptbk coder run --dry-run

# Run with OpenAI Codex
ptbk coder run --harness openai-codex --model gpt-5.2-codex

# Run with project instructions loaded from AGENTS.md
ptbk coder run --harness openai-codex --model gpt-5.2-codex --agent agents/coding/developer.book --context AGENTS.md

# Run with one-off inline instructions
ptbk coder run --harness openai-codex --model gpt-5.2-codex --context "Focus only on src/cli"

# Run with OpenAI Codex and explicitly allow credit spending
ptbk coder run --harness openai-codex --model gpt-5.2-codex --allow-credits

# Run with explicit post-commit git pushing
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --auto-push

# Run with GitHub Copilot
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh

# Run tests before coding and let one repair prompt fix pre-existing failures
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --test-before yes-and-fix

# Run with plain streaming output for logging/debugging
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --no-ui

# Run with Gemini
ptbk coder run --harness gemini --model gemini-3-flash-preview

# Run with Claude Code
ptbk coder run --harness claude-code

# Run with priority range filter
ptbk coder run --harness openai-codex --model gpt-5.2-codex --min-priority 1 --max-priority 5

# Run with automatic testing-server migrations after each prompt
ptbk coder run --harness openai-codex --model gpt-5.2-codex --auto-migrate

# Run each prompt in its own isolated git worktree
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --isolate

# Start the next prompt even though the working tree still has uncommitted changes
ptbk coder run --harness claude-code --git-changes ignore

# Continue the one prompt a killed or crashed coder left behind in the [^] status
ptbk coder run --harness claude-code --git-changes continue
```

## Prompt statuses

Every prompt starts with a checklist marker on its first line and the coder rewrites that marker as the task moves along:

| Marker | Meaning                                       |
| ------ | --------------------------------------------- |
| `[-]`  | Not ready to be picked up at all              |
| `[ ]`  | Ready, waiting for the next free coding round |
| `[^]`  | Being implemented right now                   |
| `[x]`  | Implemented, verified and committed           |
| `[!]`  | Failed                                        |

The `[^]` in-progress status is rewritten before every single step of the round, so it always names the harness, the model, the steps which already finished and the step which is running:

```text
[ ]
[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation in progress
[^] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.2036 10 minutes; Testing in progress
[x] by OpenAI Codex `gpt-5.6-luna` thinking `max` (ChatGPT account) - Implementation ~$0.2036 10 minutes; Testing 35 minutes
```

Only the final `[x]` state is committed, because the round commit is created after the prompt has been implemented and verified. The `[^]` status is deliberately never reverted: when the coder is killed or crashes, the prompt file keeps `[^]` as the signal that this task was left in the middle of its implementation. Such a prompt is not picked up again automatically — decide yourself whether to reset it to `[ ]`, to keep the partial work, or to resume it with `--git-changes continue`.

## Dirty working tree

`--git-changes` decides what happens when the working tree still has uncommitted changes before a prompt starts:

| Mode       | Behavior                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| `fail`     | Refuses to start and asks for a commit, a stash or one of the other two modes (the default)                  |
| `ignore`   | Starts the next `[ ]` prompt anyway and leaves the uncommitted changes where they are                        |
| `continue` | Resumes the interrupted `[^]` prompt with its half-finished changes still in place                           |

`continue` expects **exactly one** prompt in the `[^]` status and fails when it finds none or more than one, because the uncommitted changes could not be attributed to a single interrupted task. Only the resuming round runs on the dirty tree; once it is finished and committed, every later round expects a clean working tree again. It cannot be combined with `--isolate`, whose fresh worktree is checked out from the last commit and would leave the uncommitted changes behind.

The harness which resumes the work does not have to be the one which started it. Its status report is built in
chronological order and remains extendable if another run is interrupted later:

```text
[^] by OpenAI Codex `gpt-5.6-luna` thinking `max`, interrupted, continued by Claude Code `claude-opus-5` thinking `high` - Implementation in progress
[x] by OpenAI Codex `gpt-5.6-luna` thinking `max`, interrupted, continued by Claude Code `claude-opus-5` thinking `high`
```

The status still names the phase currently running, but it does not append a completed continuation's own cost and
duration as though they measured the whole interrupted prompt.

## Isolated runs

With `--isolate`, no prompt is ever implemented in the working tree you started the coder from:

-   Each task gets a temporary git worktree in `.promptbook/coder-isolation-worktrees/<task-name>` on branch `ptbk-coder-isolation/<task-name>` (for example `.promptbook/coder-isolation-worktrees/2026-07-0700-ptbk-coder-timing`).
-   The worktree gets its own copy of the project `.env`, so the isolated task runs with its own environment.
-   The coding agent, the `--test` verification command and the round commit all happen inside the worktree.
-   Once the task is implemented and verified, it is merged back into the branch the coder runs on as one commit and the worktree plus its branch are deleted.
-   If the merge fails, the task is marked as `[!]` instead of `[x]`, the failure is committed into the original worktree, the temporary worktree is kept for a manual merge, and the coder continues with the next task.

Because the worktrees live inside `.promptbook`, `--isolate` requires that folder to be git-ignored (`ptbk coder init` sets this up).

## Agent identity configuration

All commits created by this script are signed with a dedicated agent identity. The helper in `scripts/run-codex-prompts/git/agentGitIdentity.ts` reads the following environment variables, so you can customize the identity per machine:

-   `CODING_AGENT_GIT_NAME` – the `user.name` value that will appear on each commit.
-   `CODING_AGENT_GIT_EMAIL` – the `user.email` value that will appear on each commit.
-   `CODING_AGENT_GPG_KEY_ID` – the GPG key ID used to sign the commit (the key must exist in your local GPG keyring).
-   `CODING_AGENT_GPG_PROGRAM` (optional) – override the GPG program if you do not want to use the default `gpg` binary.

Set the values via `.env`, shell variables, or whichever secrets manager you prefer. The script will fail fast if the identity is missing so that commits cannot fall back to the primary user's configuration.

If you need a fresh agent key, generate it with GPG (for example from a temporary config file: specify `Name-Real`, `Name-Email`, `Key-Type`, `Key-Length`, `%no-protection`, and `%commit`) and set `CODING_AGENT_GPG_KEY_ID` to the new key's long ID.

You can bootstrap your environment with the "Promptbook Coding Agent" details (name `Promptbook Coding Agent`, email `coding-agent@promptbook.studio`, key ID `13406525ED912F938FEA85AB4046C687298B2382`), then swap them out whenever a different persona makes more sense.
