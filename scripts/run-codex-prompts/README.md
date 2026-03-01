# run-codex-prompts

`run-codex-prompts.ts` drives the Coding Agent workflow. It loads the `prompts/` tasks, runs them through the selected model runner (OpenAI, Gemini, Claude, etc.), and automatically writes, stages, and commits the generated files.

## Usage

### Via Promptbook CLI (recommended):

```bash
# External usage (when promptbook is installed globally)
ptbk coder run --agent openai-codex --model gpt-5.2-codex

# Internal usage (within Promptbook repository)
npx ts-node ./src/cli/test/ptbk.ts coder run --agent openai-codex --model gpt-5.2-codex
```

### Direct execution (legacy):

```bash
npx ts-node ./scripts/run-codex-prompts/run-codex-prompts.ts --agent openai-codex --model gpt-5.2-codex
```

### Available options:

```bash
--dry-run                     # Print unwritten prompts without executing
--agent <agent-name>          # Select runner: openai-codex, cline, claude-code, opencode, gemini (required for non-dry-run)
--model <model>               # Model to use (required for openai-codex and gemini)
--priority <minimum-priority> # Filter prompts by minimum priority level (default: 0)
--no-wait                     # Skip user prompts between processing
--ignore-git-changes          # Skip clean working tree check before running prompts
```

### Examples:

```bash
# Dry run to preview prompts
ptbk coder run --dry-run

# Run with OpenAI Codex
ptbk coder run --agent openai-codex --model gpt-5.2-codex

# Run with Gemini
ptbk coder run --agent gemini --model gemini-3-flash-preview --no-wait

# Run with Claude Code
ptbk coder run --agent claude-code --no-wait

# Run with priority filter
ptbk coder run --agent openai-codex --model gpt-5.2-codex --priority 1
```

## Agent identity configuration

All commits created by this script are signed with a dedicated agent identity. The helper in `scripts/run-codex-prompts/git/agentGitIdentity.ts` reads the following environment variables, so you can customize the identity per machine:

- `CODING_AGENT_GIT_NAME` – the `user.name` value that will appear on each commit.
- `CODING_AGENT_GIT_EMAIL` – the `user.email` value that will appear on each commit.
- `CODING_AGENT_GPG_KEY_ID` – the GPG key ID used to sign the commit (the key must exist in your local GPG keyring).
- `CODING_AGENT_GPG_PROGRAM` (optional) – override the GPG program if you do not want to use the default `gpg` binary.

Set the values via `.env`, shell variables, or whichever secrets manager you prefer. The script will fail fast if the identity is missing so that commits cannot fall back to the primary user's configuration.

If you need a fresh agent key, generate it with GPG (for example from a temporary config file: specify `Name-Real`, `Name-Email`, `Key-Type`, `Key-Length`, `%no-protection`, and `%commit`) and set `CODING_AGENT_GPG_KEY_ID` to the new key's long ID.

You can bootstrap your environment with the "Promptbook Coding Agent" details (name `Promptbook Coding Agent`, email `coding-agent@promptbook.studio`, key ID `13406525ED912F938FEA85AB4046C687298B2382`), then swap them out whenever a different persona makes more sense.
