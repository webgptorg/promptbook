[x] by Claude Code `claude-opus-5` thinking `max` - Implementation $8.82 25 minutes; Testing 12 minutes,  commited manually

[✨🕗] `ptbk coder` updates OpenAI Codex via `npm install -g @openai/codex@latest` even when Codex is the standalone install (`codex update`)

**Version:** `ptbk` 0.114.0-26, Codex CLI 0.149.1 installed by the official standalone installer (`~/.codex/packages/standalone/current/bin/codex`, symlink in `~/.local/bin`).

**What happened**

`ptbk coder ping --harness openai-codex ...` reported Codex as outdated and offered an update. Accepting ran `npm install -g @openai/codex@latest`, which installed a _second_ Codex into the active nvm Node prefix. Result: two Codex binaries, the one on PATH depends on which Node version is active; the standalone one stayed at 0.149.1.

**Expected**

Detect the install method (standalone dir / Homebrew / npm) and either run the matching updater (`codex update` for the standalone package) or only print instructions. At minimum warn when `which codex` is not inside an npm prefix.

**Workaround**: `--no-harness-update`, then `codex update` manually and remove the npm copy.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing) if necessary
-   Add the changes into the [changelog](changelog/_current-preversion.md)

