import { CLI_AGENT_THINKING_LEVEL_VALUES } from '../../../book-3.0/cliAgentEnv';

/**
 * Supported thinking-level CLI values for coding-agent runners with configurable reasoning effort.
 *
 * @private internal shared utility of `ptbk coder run`
 */
export const THINKING_LEVEL_VALUES = CLI_AGENT_THINKING_LEVEL_VALUES;

/**
 * Supported reasoning effort values for coding-agent runners with configurable thinking levels.
 *
 * @private internal shared utility of `ptbk coder run`
 */
export type ThinkingLevel = (typeof THINKING_LEVEL_VALUES)[number];

/**
 * Parses and validates an optional thinking-level option value.
 *
 * @private internal shared utility of `ptbk coder run`
 */
export function parseThinkingLevel(thinkingLevelValue: string | undefined): ThinkingLevel | undefined {
    if (thinkingLevelValue === undefined) {
        return undefined;
    }

    if (THINKING_LEVEL_VALUES.includes(thinkingLevelValue as ThinkingLevel)) {
        return thinkingLevelValue as ThinkingLevel;
    }

    throw new Error(`Invalid thinking level "${thinkingLevelValue}". Use one of: ${THINKING_LEVEL_VALUES.join(', ')}.`);
}

// Note: [🟡] Code for CLI command [run](src/cli/cli-commands/coder/run.ts) should never be published outside of `@promptbook/cli`
