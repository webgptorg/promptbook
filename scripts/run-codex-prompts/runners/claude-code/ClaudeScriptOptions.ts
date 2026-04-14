/**
 * Options for building the Claude Code shell script.
 */
export type ClaudeScriptOptions = {
    prompt: string;
    /**
     * Enables realtime stream-json output.
     */
    streamOutput?: boolean;
};
