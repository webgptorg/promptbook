import moment from 'moment';
import type { AgentRunOptions } from '../../AgentRunOptions';
import { buildAgentMessageScriptPath } from '../../messages/buildAgentMessageScriptPath';
import { WAITING_FOR_MESSAGE_LABEL } from '../../ui/agentRunUiConstants';
import { buildAgentRunUiFrame } from '../../ui/buildAgentRunUiFrame';
import { resolvePromptRunner } from '../../../run-codex-prompts/main/resolvePromptRunner';
import type { PromptStats } from '../../../run-codex-prompts/prompts/types/PromptStats';
import type {
    AgentRunMessagePreviewSection,
    AgentRunStatusTableRow,
} from '../../../run-codex-prompts/ui/buildCoderRunUiFrame';
import { renderCoderRunUi, type CoderRunUiHandle } from '../../../run-codex-prompts/ui/renderCoderRunUi';
import { createCoderRunOptionsForAgent } from '../createCoderRunOptionsForAgent';
import type { AgentTickUiPresentation } from '../tickAgentMessages';
import { formatProjectPath } from './formatProjectPath';
import type { LocalAgentRunnerProjectSummary } from './LocalAgentRunnerProjectSummary';

/**
 * Visible width reserved for the legacy status-word column in plain status lines.
 */
const LEGACY_STATUS_WIDTH = 9;

/**
 * Maximum number of project detail rows rendered in compact dashboard states.
 */
const MULTI_AGENT_DETAIL_LINE_LIMIT = 6;

/**
 * Shared empty local-agent status line.
 */
const NO_DIRECT_CHILD_AGENT_REPOSITORIES_LABEL = 'No direct child agent repositories detected yet.';

/**
 * Owns all rich UI state projection for `runMultipleAgentMessages`.
 *
 * @private class of `runMultipleAgentMessages`
 */
export class MultipleAgentRunUiPresenter {
    private constructor(
        private readonly runOptions: AgentRunOptions,
        private readonly rootPath: string,
        private readonly handle: CoderRunUiHandle | undefined,
    ) {}

    /**
     * Creates the shared multi-agent rich UI when the terminal supports it.
     */
    public static create(runOptions: AgentRunOptions, rootPath: string): MultipleAgentRunUiPresenter {
        if (runOptions.noUi || !process.stdout.isTTY) {
            return new MultipleAgentRunUiPresenter(runOptions, rootPath, undefined);
        }

        const uiHandle = renderCoderRunUi(moment(), { buildFrameLines: buildAgentRunUiFrame });
        const presenter = new MultipleAgentRunUiPresenter(runOptions, rootPath, uiHandle);

        presenter.setConfig(0, 0);
        uiHandle.state.setAgentStatusLines([NO_DIRECT_CHILD_AGENT_REPOSITORIES_LABEL]);
        uiHandle.state.setAgentStatusTableRows([]);
        uiHandle.state.setMessagePreviewSections([]);

        return presenter;
    }

    /**
     * Rich terminal UI handle, when the current process can render one.
     */
    public get uiHandle(): CoderRunUiHandle | undefined {
        return this.handle;
    }

    /**
     * Updates the shared UI while GitHub repository synchronization is running.
     */
    public updateForGithubSynchronization(lastObservedProjectCount: number): void {
        if (!this.handle) {
            return;
        }

        this.setConfig(lastObservedProjectCount, 0);
        this.handle.state.setPhase('loading');
        this.handle.state.setStatusMessage('Checking GitHub for new agent repositories');
        this.handle.state.setDetailLines(['Refreshing configured `agent-*` repositories from GitHub when available.']);
    }

    /**
     * Updates the shared UI while watched child repositories are being pulled.
     */
    public updateForAutoPull(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        ignoredAgentCount: number,
        projectSummariesToPull: ReadonlyArray<LocalAgentRunnerProjectSummary>,
    ): void {
        if (!this.handle) {
            return;
        }

        this.setConfig(projectSummaries.length, ignoredAgentCount);
        this.handle.state.updateProgress(this.createQueueProgressSnapshot(projectSummaries));
        this.handle.state.setAgentStatusLines(this.buildStatusLines(projectSummaries, new Set()));
        this.handle.state.setAgentStatusTableRows(this.buildStatusTableRows(projectSummaries, new Set()));
        this.handle.state.setPhase('loading');
        this.handle.state.setStatusMessage('Pulling latest changes for watched repositories');
        this.handle.state.setDetailLines(this.buildAutoPullDetailLines(projectSummariesToPull));
    }

    /**
     * Updates the shared UI to the idle multi-agent watch state.
     */
    public updateForWatching(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        ignoredAgentCount: number,
    ): void {
        if (!this.handle) {
            return;
        }

        this.setConfig(projectSummaries.length, ignoredAgentCount);
        this.handle.state.updateProgress(this.createQueueProgressSnapshot(projectSummaries));
        this.handle.state.setCurrentPrompt('');
        this.handle.state.setPhase('waiting');
        this.handle.state.setStatusMessage(
            projectSummaries.length > 0
                ? `Watching ${this.formatAgentCount(projectSummaries.length)}`
                : 'Watching for Agents',
        );
        this.handle.state.setDetailLines(this.buildWatchingDetailLines(projectSummaries));
        this.handle.state.setAgentStatusLines(this.buildStatusLines(projectSummaries, new Set()));
        this.handle.state.setAgentStatusTableRows(this.buildStatusTableRows(projectSummaries, new Set()));
        this.handle.state.setMessagePreviewLines([WAITING_FOR_MESSAGE_LABEL]);
        this.handle.state.setMessagePreviewSections([]);
    }

    /**
     * Updates the shared UI while one or more child repositories are answering queued messages.
     */
    public updateForAnswering(options: {
        readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
        readonly answeringProjectPaths: ReadonlySet<string>;
        readonly ignoredAgentCount: number;
        readonly activeMessageCount: number;
    }): void {
        if (!this.handle) {
            return;
        }

        const { projectSummaries, answeringProjectPaths, ignoredAgentCount, activeMessageCount } = options;

        this.setConfig(projectSummaries.length, ignoredAgentCount);
        this.handle.state.updateProgress(this.createQueueProgressSnapshot(projectSummaries));
        this.handle.state.setCurrentPrompt('');
        this.handle.state.setCurrentScriptPaths(this.buildScriptPaths(projectSummaries, answeringProjectPaths));
        this.handle.state.setPhase('running');
        this.handle.state.setStatusMessage(
            `Answering ${activeMessageCount} queued message${activeMessageCount === 1 ? '' : 's'}`,
        );
        this.handle.state.setDetailLines(this.buildAnsweringDetailLines(projectSummaries, answeringProjectPaths));
        this.handle.state.setAgentStatusLines(this.buildStatusLines(projectSummaries, answeringProjectPaths));
        this.handle.state.setAgentStatusTableRows(this.buildStatusTableRows(projectSummaries, answeringProjectPaths));
        this.handle.state.setMessagePreviewSections(
            this.buildMessagePreviewSections(projectSummaries, answeringProjectPaths),
        );
    }

    /**
     * Builds the multi-agent presentation passed into one active queued-message tick.
     */
    public buildTickPresentation(options: {
        readonly projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>;
        readonly answeringProjectPaths: ReadonlySet<string>;
        readonly ignoredAgentCount: number;
    }): AgentTickUiPresentation {
        const { projectSummaries, answeringProjectPaths, ignoredAgentCount } = options;

        return {
            isSharedDashboard: true,
            sessionAgentName: this.formatAgentCount(projectSummaries.length, ignoredAgentCount),
            agentStatusLines: this.buildStatusLines(projectSummaries, answeringProjectPaths),
            agentStatusTableRows: this.buildStatusTableRows(projectSummaries, answeringProjectPaths),
            messagePreviewLines: this.buildUserMessageLines(projectSummaries, answeringProjectPaths),
            messagePreviewSections: this.buildMessagePreviewSections(projectSummaries, answeringProjectPaths),
            progressStats: this.createQueueProgressSnapshot(projectSummaries),
            completedAgentStatusLines: this.buildStatusLines(projectSummaries, new Set()),
            completedAgentStatusTableRows: this.buildStatusTableRows(projectSummaries, new Set()),
            completedMessagePreviewLines: [WAITING_FOR_MESSAGE_LABEL],
            completedMessagePreviewSections: [],
            completedProgressStats: this.createCompletedQueueProgressSnapshot(projectSummaries, answeringProjectPaths),
        };
    }

    private setConfig(agentCount: number, ignoredAgentCount: number): void {
        const sharedRunOptions = createCoderRunOptionsForAgent(this.runOptions);
        const { runner, actualRunnerModel } = resolvePromptRunner(sharedRunOptions);

        this.handle?.state.setConfig({
            agentName: runner.name,
            localAgentName: this.formatAgentCount(agentCount, ignoredAgentCount),
            modelName: actualRunnerModel,
            thinkingLevel: this.runOptions.thinkingLevel,
            priority: 0,
        });
    }

    private buildScriptPaths(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        answeringProjectPaths: ReadonlySet<string>,
    ): string[] {
        return projectSummaries
            .filter((projectSummary) => answeringProjectPaths.has(projectSummary.project.projectPath))
            .map((projectSummary) =>
                projectSummary.queuedMessagePreview
                    ? buildAgentMessageScriptPath(
                          projectSummary.project.projectPath,
                          projectSummary.queuedMessagePreview.queuedMessage,
                      )
                    : undefined,
            )
            .filter((scriptPath): scriptPath is string => Boolean(scriptPath));
    }

    private createQueueProgressSnapshot(projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>): PromptStats {
        return {
            done: projectSummaries.reduce(
                (totalFinishedMessages, projectSummary) => totalFinishedMessages + projectSummary.finishedMessageCount,
                0,
            ),
            forAgent: projectSummaries.reduce(
                (totalQueuedMessages, projectSummary) => totalQueuedMessages + projectSummary.queuedMessageCount,
                0,
            ),
            belowMinimumPriority: 0,
            toBeWritten: 0,
        };
    }

    private createCompletedQueueProgressSnapshot(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        answeringProjectPaths: ReadonlySet<string>,
    ): PromptStats {
        const activeAnsweringCount = projectSummaries.filter((projectSummary) =>
            answeringProjectPaths.has(projectSummary.project.projectPath),
        ).length;
        const progressStats = this.createQueueProgressSnapshot(projectSummaries);

        return {
            ...progressStats,
            done: progressStats.done + activeAnsweringCount,
            forAgent: Math.max(0, progressStats.forAgent - activeAnsweringCount),
        };
    }

    private buildStatusLines(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        answeringProjectPaths: ReadonlySet<string>,
    ): string[] {
        if (projectSummaries.length === 0) {
            return [NO_DIRECT_CHILD_AGENT_REPOSITORIES_LABEL];
        }

        return projectSummaries.map((projectSummary) => {
            const isAnswering = answeringProjectPaths.has(projectSummary.project.projectPath);
            const status = isAnswering ? 'Answering' : 'Idle';
            const currentMessage = isAnswering ? this.formatCurrentAgentMessage(projectSummary) : '';

            return `${status.padEnd(LEGACY_STATUS_WIDTH)} ${projectSummary.localAgentName} (${formatProjectPath(
                this.rootPath,
                projectSummary.project.projectPath,
            )})${currentMessage}`;
        });
    }

    private buildStatusTableRows(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        answeringProjectPaths: ReadonlySet<string>,
    ): AgentRunStatusTableRow[] {
        return projectSummaries.map((projectSummary) => ({
            status: answeringProjectPaths.has(projectSummary.project.projectPath) ? 'Answering' : 'Idle',
            agentName: projectSummary.localAgentName,
            url: projectSummary.localAgentUrl,
        }));
    }

    private formatCurrentAgentMessage(projectSummary: LocalAgentRunnerProjectSummary): string {
        if (!projectSummary.queuedMessagePreview) {
            return '';
        }

        return `  ·  ${projectSummary.queuedMessagePreview.queuedMessage.relativePath}: ${projectSummary.queuedMessagePreview.latestUserMessageSummary}`;
    }

    private buildUserMessageLines(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        answeringProjectPaths: ReadonlySet<string>,
    ): string[] {
        const answeringMessageLines = projectSummaries
            .filter((projectSummary) => answeringProjectPaths.has(projectSummary.project.projectPath))
            .flatMap((projectSummary) => this.buildAnsweringAgentMessageLines(projectSummary));

        return answeringMessageLines.length > 0 ? answeringMessageLines : [WAITING_FOR_MESSAGE_LABEL];
    }

    private buildMessagePreviewSections(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        answeringProjectPaths: ReadonlySet<string>,
    ): AgentRunMessagePreviewSection[] {
        return projectSummaries
            .filter((projectSummary) => answeringProjectPaths.has(projectSummary.project.projectPath))
            .map((projectSummary) => ({
                title: `User message: ${projectSummary.localAgentName}`,
                messagePreviewLines: projectSummary.queuedMessagePreview?.latestUserMessageLines.length
                    ? projectSummary.queuedMessagePreview.latestUserMessageLines
                    : [projectSummary.queuedMessagePreview?.queuedMessage.relativePath || WAITING_FOR_MESSAGE_LABEL],
            }));
    }

    private buildAnsweringAgentMessageLines(projectSummary: LocalAgentRunnerProjectSummary): string[] {
        const messageLines = projectSummary.queuedMessagePreview?.latestUserMessageLines;

        if (!messageLines || messageLines.length === 0) {
            return [
                `${projectSummary.localAgentName}: ${
                    projectSummary.queuedMessagePreview?.queuedMessage.relativePath || 'Queued message'
                }`,
            ];
        }

        const prefix = `${projectSummary.localAgentName}: `;
        const continuationPrefix = ' '.repeat(prefix.length);

        return messageLines.map((messageLine, lineIndex) =>
            lineIndex === 0 ? `${prefix}${messageLine}` : `${continuationPrefix}${messageLine}`,
        );
    }

    private buildAnsweringDetailLines(
        projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>,
        answeringProjectPaths: ReadonlySet<string>,
    ): string[] {
        return projectSummaries
            .filter((projectSummary) => answeringProjectPaths.has(projectSummary.project.projectPath))
            .slice(0, MULTI_AGENT_DETAIL_LINE_LIMIT)
            .map(
                (projectSummary) =>
                    `${formatProjectPath(this.rootPath, projectSummary.project.projectPath)}  ·  ${
                        projectSummary.queuedMessagePreview?.queuedMessage.relativePath || 'Queued message'
                    }`,
            );
    }

    private buildWatchingDetailLines(projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>): string[] {
        const projectDetailLines = projectSummaries
            .slice(0, MULTI_AGENT_DETAIL_LINE_LIMIT)
            .map(
                (projectSummary) =>
                    `${formatProjectPath(this.rootPath, projectSummary.project.projectPath)}  ·  ${
                        projectSummary.localAgentName
                    }  ·  ${projectSummary.queuedMessageCount} queued  ·  ${
                        projectSummary.finishedMessageCount
                    } finished`,
            );

        if (projectSummaries.length === 0) {
            return [NO_DIRECT_CHILD_AGENT_REPOSITORIES_LABEL];
        }

        if (projectSummaries.length > projectDetailLines.length) {
            projectDetailLines.push(
                `…and ${projectSummaries.length - projectDetailLines.length} more direct child repositories.`,
            );
        }

        return projectDetailLines;
    }

    private buildAutoPullDetailLines(projectSummaries: ReadonlyArray<LocalAgentRunnerProjectSummary>): string[] {
        const projectDetailLines = projectSummaries
            .slice(0, MULTI_AGENT_DETAIL_LINE_LIMIT)
            .map((projectSummary) => `Pulling ${formatProjectPath(this.rootPath, projectSummary.project.projectPath)}`);

        if (projectSummaries.length > projectDetailLines.length) {
            projectDetailLines.push(
                `…and ${projectSummaries.length - projectDetailLines.length} more direct child repositories.`,
            );
        }

        return projectDetailLines;
    }

    private formatAgentCount(agentCount: number, ignoredAgentCount = 0): string {
        const agentCountLabel = `${agentCount} Agent${agentCount === 1 ? '' : 's'}`;

        if (ignoredAgentCount === 0) {
            return agentCountLabel;
        }

        return `${agentCountLabel}  ·  ${ignoredAgentCount} ignored`;
    }
}
