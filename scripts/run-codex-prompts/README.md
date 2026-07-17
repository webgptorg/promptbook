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
--no-ui                       # Disable the rich terminal UI and stream plain console output instead
--thinking-level <level>      # Reasoning effort for OpenAI Codex and GitHub Copilot: low, medium, high, xhigh
--priority <minimum-priority> # Alias for --min-priority
--min-priority <minimum-priority> # Filter prompts by minimum priority level
--max-priority <maximum-priority> # Filter prompts by maximum priority level
--allow-credits               # Allow OpenAI Codex runner to spend credits when limits are exhausted
--auto-push                  # Push each successful commit to the configured remote
--auto-migrate                # Run testing-server DB migrations after each successful prompt
--allow-destructive-auto-migrate # Override destructive SQL heuristic guard in auto-migrate mode
--no-auto                     # Wait for user confirmation before each prompt instead of running automatically
--wait-after-prompt <duration>    # Wait this long after each prompt finishes before starting the next prompt (default 0)
--wait-between-prompts <duration> # Pace prompts so each next prompt starts at least this long after the previous start (default 0)
--wait-after-error <duration>     # Wait this long before retrying after an error (up to 3 retries, default 10m)
--ignore-git-changes          # Skip clean working tree check before running prompts
--no-normalize-line-endings   # Disable per-round CRLF -> LF normalization for changed files
```

For `--harness openai-codex`, credits are opt-in. If Codex reports that credits are required and `--allow-credits` is not set, the runner fails fast with a rerun hint.

### Terminal controls

```text
P  Pause  S  Skip current waiting  X  End with this prompt  CTRL+C  Exit
```

Press `X` again after requesting the dynamic end to continue the full current run.

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
```

## Agent identity configuration

All commits created by this script are signed with a dedicated agent identity. The helper in `scripts/run-codex-prompts/git/agentGitIdentity.ts` reads the following environment variables, so you can customize the identity per machine:

-   `CODING_AGENT_GIT_NAME` – the `user.name` value that will appear on each commit.
-   `CODING_AGENT_GIT_EMAIL` – the `user.email` value that will appear on each commit.
-   `CODING_AGENT_GPG_KEY_ID` – the GPG key ID used to sign the commit (the key must exist in your local GPG keyring).
-   `CODING_AGENT_GPG_PROGRAM` (optional) – override the GPG program if you do not want to use the default `gpg` binary.

Set the values via `.env`, shell variables, or whichever secrets manager you prefer. The script will fail fast if the identity is missing so that commits cannot fall back to the primary user's configuration.

If you need a fresh agent key, generate it with GPG (for example from a temporary config file: specify `Name-Real`, `Name-Email`, `Key-Type`, `Key-Length`, `%no-protection`, and `%commit`) and set `CODING_AGENT_GPG_KEY_ID` to the new key's long ID.

You can bootstrap your environment with the "Promptbook Coding Agent" details (name `Promptbook Coding Agent`, email `coding-agent@promptbook.studio`, key ID `13406525ED912F938FEA85AB4046C687298B2382`), then swap them out whenever a different persona makes more sense.
