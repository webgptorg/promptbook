import type { AgentMessageFile } from '../../messages/AgentMessageFile';

/**
 * One harness task currently answering a queued message.
 *
 * @private type of `runMultipleAgentMessages`
 */
export type ActiveAgentMessageTask = {
    readonly projectPath: string;
    readonly queuedMessage: AgentMessageFile;
    readonly promise: Promise<void>;
};
