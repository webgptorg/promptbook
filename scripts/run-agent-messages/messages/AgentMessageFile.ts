/**
 * One queued `.book` message-thread file selected for an agent run.
 */
export type AgentMessageFile = {
    readonly absolutePath: string;
    readonly relativePath: string;
    readonly fileName: string;
};
