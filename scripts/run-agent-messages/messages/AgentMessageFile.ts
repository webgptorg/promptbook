/**
 * One queued markdown message file selected for an agent run.
 */
export type AgentMessageFile = {
    readonly absolutePath: string;
    readonly relativePath: string;
    readonly fileName: string;
};
