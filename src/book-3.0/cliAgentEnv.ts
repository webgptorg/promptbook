// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * All CLI harness names supported by `CliAgent` and `ptbk agent exec`.
 *
 * @public exported from `@promptbook/node`
 */
export const CLI_AGENT_HARNESS_NAMES = [
    'openai-codex',
    'github-copilot',
    'cline',
    'claude-code',
    'opencode',
    'gemini',
] as const;

/**
 * All supported thinking-level values for CLI coding-agent runners.
 *
 * @public exported from `@promptbook/node`
 */
export const CLI_AGENT_THINKING_LEVEL_VALUES = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

/**
 * Environment variable used as the default runner identifier when `--harness` is omitted or not set in `CliAgent`.
 *
 * Set this to one of the harness names (`openai-codex`, `github-copilot`, `cline`, `claude-code`, `opencode`, `gemini`)
 * so that `CliAgent` and `ptbk agent exec` can run without an explicit `harness` option.
 *
 * @public exported from `@promptbook/node`
 */
export const PTBK_HARNESS_ENV = 'PTBK_HARNESS';

/**
 * Environment variable used as the default runner model when `--model` is omitted or not set in `CliAgent`.
 *
 * @public exported from `@promptbook/node`
 */
export const PTBK_MODEL_ENV = 'PTBK_MODEL';

/**
 * Environment variable used as the default thinking level when `--thinking-level` is omitted or not set in `CliAgent`.
 *
 * @public exported from `@promptbook/node`
 */
export const PTBK_THINKING_LEVEL_ENV = 'PTBK_THINKING_LEVEL';
