import type { ThinkingLevel } from '../../../../src/cli/cli-commands/coder/ThinkingLevel';

/**
 * Options for building the Claude Code shell script.
 */
export type ClaudeScriptOptions = {
    prompt: string;
    /**
     * Optional model override forwarded to Claude Code CLI as `--model`.
     */
    model?: string;
    /**
     * Optional reasoning effort override forwarded to Claude Code CLI as `--effort`.
     */
    thinkingLevel?: ThinkingLevel;
    /**
     * Optional Claude Code session id used to continue a previously interrupted session.
     */
    resumeSessionId?: string;
};
