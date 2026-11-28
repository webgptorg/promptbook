import type { AgentMessageFile } from '../../messages/AgentMessageFile';
import type { AgentRunQueuedMessagePreview } from '../../ui/loadAgentRunUiMetadata';
import type { LocalAgentRunnerProject } from '../listLocalAgentRunnerProjects';

/**
 * Direct child repository summary rendered in the shared multi-agent dashboard.
 *
 * @private type of `runMultipleAgentMessages`
 */
export type LocalAgentRunnerProjectSummary = {
    readonly project: LocalAgentRunnerProject;
    readonly localAgentName: string;
    readonly localAgentUrl: string;
    readonly queuedMessages: ReadonlyArray<AgentMessageFile>;
    readonly queuedMessageCount: number;
    readonly finishedMessageCount: number;
    readonly queuedMessagePreview?: AgentRunQueuedMessagePreview;
};

/**
 * Local watched and ignored project summaries resolved in one directory scan.
 *
 * @private type of `runMultipleAgentMessages`
 */
export type LocalAgentRunnerProjectSummariesResult = {
    readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
    readonly ignoredProjectCount: number;
};
