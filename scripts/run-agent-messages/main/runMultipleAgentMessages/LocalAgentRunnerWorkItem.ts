import type { AgentMessageFile } from '../../messages/AgentMessageFile';
import type { LocalAgentRunnerProjectSummary } from './LocalAgentRunnerProjectSummary';

/**
 * One selected queued message that should be handled by a harness task.
 *
 * @private type of `runMultipleAgentMessages`
 */
export type LocalAgentRunnerWorkItem = {
    readonly projectSummary: LocalAgentRunnerProjectSummary;
    readonly queuedMessage: AgentMessageFile;
};
