import type { AgentRunOptions } from '../../../../../scripts/run-agent-messages/AgentRunOptions';
import type { LocalAgentRunnerLimits } from './LocalAgentRunnerLimits';
import type { StartAgentsServerOptions } from './StartAgentsServerOptions';

/**
 * Creates local no-git agent runner options for folders managed by the Agents Server database.
 *
 * @private internal utility of `startAgentsServer`
 */
export function createLocalAgentRunOptions(
    options: StartAgentsServerOptions,
    localAgentRunnerLimits: LocalAgentRunnerLimits,
): AgentRunOptions {
    return {
        agentName: options.agentName,
        model: options.model,
        noUi: options.noUi,
        thinkingLevel: options.thinkingLevel,
        noCommit: true,
        ignoreGitChanges: true,
        normalizeLineEndings: false,
        allowCredits: options.allowCredits,
        autoPush: false,
        autoPull: false,
        autoClone: false,
        maxMessageProcessingFailures: localAgentRunnerLimits.maxFailedAttempts,
        maxParallelMessages: localAgentRunnerLimits.maxParallelMessages,
    };
}
