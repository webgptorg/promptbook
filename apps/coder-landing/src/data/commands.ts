/**
 * Canonical shell commands shown on the landing page.
 *
 * Note: This is the single source of truth for every terminal sample on the page,
 *       specified in [`specs/content/commands.md`](../../specs/content/commands.md)
 */

/**
 * Command which installs Promptbook (and with it `ptbk coder`) into a project.
 */
export const INSTALL_COMMAND = 'npm install ptbk';

/**
 * Command which installs Promptbook globally as an alternative to the local install.
 */
export const INSTALL_GLOBAL_COMMAND = 'npm install --global ptbk';

/**
 * Command which initializes the `ptbk coder` configuration in the current project.
 */
export const INIT_COMMAND = 'ptbk coder init';

/**
 * Minimal command which runs the prompt queue through Claude Code.
 */
export const RUN_COMMAND = 'ptbk coder run --harness claude-code';

/**
 * Command which previews the prompt queue without executing anything.
 */
export const DRY_RUN_COMMAND = 'ptbk coder run --dry-run';

/**
 * Full-featured command which starts the coder server with kanban UI, agent persona,
 * project context and post-prompt test verification.
 */
export const SERVER_COMMAND =
    'ptbk coder server --harness claude-code --model fable --thinking-level max --agent agents/developer.book --context AGENTS.md --test npm run test';

/**
 * Command typed by the live terminal dashboard in the hero.
 */
export const LIVE_TERMINAL_RUN_COMMAND =
    'ptbk coder run --harness claude-code --model fable --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --test npm run test-for-ptbk-coder --wait-between-prompts 4h --limit 1';

/**
 * Command which runs the queue with the developer agent persona from a `.book` file.
 */
export const AGENT_RUN_COMMAND =
    'ptbk coder run --harness claude-code --model fable --agent agents/developer.book --context AGENTS.md';

/**
 * Command which interactively verifies completed prompts and archives them to `prompts/done/`.
 */
export const VERIFY_COMMAND = 'ptbk coder verify';
