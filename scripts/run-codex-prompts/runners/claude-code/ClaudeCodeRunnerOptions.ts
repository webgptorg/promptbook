import type { ThinkingLevel } from '../../../../src/cli/cli-commands/coder/ThinkingLevel';

/**
 * Options for the Claude Code runner.
 */
export type ClaudeCodeRunnerOptions = {
    /**
     * Optional model override forwarded to Claude Code CLI as `--model`.
     */
    model?: string;
    /**
     * Optional reasoning effort override forwarded to Claude Code CLI as `--effort`.
     */
    thinkingLevel?: ThinkingLevel;
};
