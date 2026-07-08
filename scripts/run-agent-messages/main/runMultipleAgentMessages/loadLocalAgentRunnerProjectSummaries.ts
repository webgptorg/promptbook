import { loadAgentRunQueuedMessagePreview, readLocalAgentUiIdentity } from '../../ui/loadAgentRunUiMetadata';
import { resolveAgentIdFromRepositoryName, type AgentIgnoreMatcher } from '../agentIgnorePatterns';
import { listLocalAgentRunnerProjects } from '../listLocalAgentRunnerProjects';
import { loadAgentMessageQueueSnapshot } from '../loadAgentMessageQueueSnapshot';
import { formatProjectPath } from './formatProjectPath';
import type {
    LocalAgentRunnerProjectSummariesResult,
    LocalAgentRunnerProjectSummary,
} from './LocalAgentRunnerProjectSummary';

/**
 * Loads current direct-child repository summaries used by the shared dashboard and queue routing.
 *
 * @private function of `runMultipleAgentMessages`
 */
export async function loadLocalAgentRunnerProjectSummaries(
    rootPath: string,
    options: {
        readonly includeMessagePreviews: boolean;
        readonly ignoreMatcher: AgentIgnoreMatcher;
    },
): Promise<LocalAgentRunnerProjectSummariesResult> {
    const projects = await listLocalAgentRunnerProjects(rootPath);
    let ignoredProjectCount = 0;

    const projectSummaries = await Promise.all(
        projects.map(async (project) => {
            const localAgentIdentity = await readLocalAgentUiIdentity(project.projectPath);
            const isProjectIgnored = options.ignoreMatcher.isIgnored({
                agentName: localAgentIdentity.localAgentName,
                normalizedAgentName: localAgentIdentity.normalizedAgentName,
                agentId: localAgentIdentity.agentId || resolveAgentIdFromRepositoryName(project.directoryName),
                repositoryName: project.directoryName,
            });

            if (isProjectIgnored) {
                ignoredProjectCount++;
                return null;
            }

            const queueSnapshot = await loadAgentMessageQueueSnapshot(project.projectPath);
            const queuedMessagePreview =
                options.includeMessagePreviews && queueSnapshot.queuedMessages[0]
                    ? await loadAgentRunQueuedMessagePreview(queueSnapshot.queuedMessages[0])
                    : undefined;

            return {
                project,
                localAgentName: localAgentIdentity.localAgentName,
                localAgentUrl: localAgentIdentity.localAgentUrl || formatProjectPath(rootPath, project.projectPath),
                queuedMessages: queueSnapshot.queuedMessages,
                queuedMessageCount: queueSnapshot.queuedMessages.length,
                finishedMessageCount: queueSnapshot.finishedMessageCount,
                ...(queuedMessagePreview ? { queuedMessagePreview } : {}),
            } satisfies LocalAgentRunnerProjectSummary;
        }),
    );

    return {
        projectSummaries: projectSummaries.filter(
            (projectSummary): projectSummary is LocalAgentRunnerProjectSummary => projectSummary !== null,
        ),
        ignoredProjectCount,
    };
}
