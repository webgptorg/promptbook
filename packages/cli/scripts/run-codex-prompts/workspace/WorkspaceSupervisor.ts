import { readFile } from 'fs/promises';
import { dirname, join, relative, resolve } from 'path';
import type { RunOptions } from '../cli/RunOptions';
import { $assertSufficientFreeDiskSpace } from '../../../src/cli/cli-commands/common/disk-space/$assertSufficientFreeDiskSpace';
import { ConflictError } from '../../../src/errors/ConflictError';
import { executeWorkspaceGit, withWorkspaceMutation } from '../git/workspaceMutation';
import { prepareCoderExecution } from '../main/prepareCoderExecution';
import { runPromptRound, type RunPromptRoundOptions } from '../main/runPromptRound';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { listRunnablePrompts } from '../prompts/listRunnablePrompts';
import { loadPromptFiles } from '../prompts/loadPromptFiles';
import { parsePromptFile } from '../prompts/parsePromptFile';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import type { AgentCollectionInWorkspace } from './AgentCollectionInWorkspace';
import type { WorkspaceGitSynchronization } from './WorkspaceGitSynchronization';
import { hashWorkspaceSource } from './workspaceAgentFiles';
import {
    discoverWorkspaceHarnesses,
    loadWorkspaceExecutionConfiguration,
    selectWorkspaceTask,
    type WorkspaceTaskSelection,
} from './workspaceExecutionSelection';
import type { WorkspaceJob, WorkspaceState } from './WorkspaceState';
import type { CoderRunUiHandle } from '../ui/renderCoderRunUi';

/** One resolved queue entry links persistent status to the parser's actual task selection. */
type EligibleWorkspaceTask = {
    readonly job: WorkspaceJob;
    readonly prompt: PromptSelection;
    readonly selection: WorkspaceTaskSelection;
};

/**
 * Persistent scheduling policy. One repository-writing job runs at a time under the same lease as UI/CLI edits.
 * Chat workers have their own bounded sessions. Discovery never calls a model while the queue is idle.
 */
export class WorkspaceSupervisor {
    /** The existing renderer consumes real shared execution events; it does not own scheduling policy. */
    public terminalUi?: CoderRunUiHandle;
    private isTickRunning = false;
    private isRecovered = false;
    private lastHarnessDiscovery = 0;
    private availableHarnesses: Awaited<ReturnType<typeof discoverWorkspaceHarnesses>> = [];
    public constructor(
        private readonly options: RunOptions & { readonly agentFilter?: string },
        private readonly collection: AgentCollectionInWorkspace,
        public readonly state: WorkspaceState,
        private readonly synchronization: WorkspaceGitSynchronization,
        private readonly services: {
            readonly discoverHarnesses?: typeof discoverWorkspaceHarnesses;
            readonly prepareExecution?: typeof prepareCoderExecution;
            readonly executeRound?: (options: RunPromptRoundOptions) => Promise<void>;
        } = {},
    ) {}

    /** One non-overlapping scheduling turn; tests exercise it with the same parser/Git/runner boundaries. */
    public async tick(): Promise<void> {
        if (this.isTickRunning) return;
        this.isTickRunning = true;
        try {
            const workspace = this.options.workspace!;
            if (this.state.getControl().isRecoveryRequested) {
                await this.collection.recoverMutations(true);
                this.state.updateControl({ isRecoveryRequested: false });
            }
            if (!this.isRecovered) {
                await this.collection.recoverMutations();
                await this.recoverClaims();
                this.isRecovered = true;
            }
            if (Date.now() - this.lastHarnessDiscovery > 60_000) {
                this.availableHarnesses = await (this.services.discoverHarnesses ?? discoverWorkspaceHarnesses)({
                    environment: this.options.environment,
                    signal: this.options.signal,
                });
                this.lastHarnessDiscovery = Date.now();
            }
            // A boundary acquires shared ownership before pull, discovery, eligibility recheck and claim.
            await withWorkspaceMutation(workspace, async () => {
                const isMutationSafe = await this.synchronization.synchronize(
                    this.state.getControl().isSynchronizationRequested,
                );
                this.state.updateControl({ isSynchronizationRequested: false });
                const tasks = await this.discoverTasks();
                const control = this.state.getControl();
                if (!isMutationSafe || control.isPaused || control.isStopping || Date.now() < (control.nextJobAt ?? 0))
                    return;
                const nextTask = this.selectFairTask(tasks);
                if (!nextTask) return;
                await $assertSufficientFreeDiskSpace(workspace.projectPath);
                const startedAt = Date.now();
                const runOptions: RunOptions = {
                    ...this.options,
                    agent: nextTask.selection.agent!.path,
                    agentName: nextTask.selection.harness,
                    model: nextTask.selection.model,
                    thinkingLevel: nextTask.selection.thinkingLevel,
                    autoPull: false,
                    autoPush: false,
                    isFinalizationRecoveryEnabled: true,
                    isExistingChangeProtectionEnabled: true,
                    takeSkipWaitingRequest: () => {
                        if (!this.state.getControl().isWaitingSkipRequested) return false;
                        this.state.updateControl({ isWaitingSkipRequested: false });
                        return true;
                    },
                };
                let execution: Awaited<ReturnType<typeof prepareCoderExecution>>;
                try {
                    execution = await (this.services.prepareExecution ?? prepareCoderExecution)(runOptions, undefined, {
                        isInitializationAllowed: false,
                        agentDirectoryPath: join(workspace.projectPath, 'agents'),
                    });
                } catch (error) {
                    this.state.updateJob(nextTask.job.id, {
                        status: 'failed',
                        reason: `Agent preparation failed: ${error instanceof Error ? error.message : String(error)}`,
                    });
                    return;
                }
                this.options.signal?.throwIfAborted();
                const expectedContent = nextTask.prompt.file.originalContent!;
                if ((await readFile(nextTask.prompt.file.path, 'utf-8')) !== expectedContent) return;
                nextTask.prompt.file.expectedContent = expectedContent;
                nextTask.prompt.file.workspaceProjectPath = workspace.projectPath;
                const claim = this.state.claimJob(nextTask.job.id, {
                    source: execution.agent?.agentSource,
                    prompt: nextTask.prompt.file.lines
                        .slice(nextTask.prompt.section.startLine, nextTask.prompt.section.endLine + 1)
                        .join('\n'),
                });
                if (!claim) return;
                let isVerified = false;
                console.info(
                    `Processing ${claim.path} with ${claim.agentName} / ${claim.harness} / ${
                        claim.model ?? 'configured model'
                    }`,
                );
                try {
                    await (this.services.executeRound ?? runPromptRound)({
                        options: {
                            ...runOptions,
                            onRoundEvent: (event) => {
                                if (event.stage === 'verified') isVerified = true;
                                this.state.updateJob(claim.id, {
                                    reason: event.stage,
                                    ...(event.stage === 'verified' ? { verification: event.detail } : {}),
                                });
                            },
                        },
                        ...execution,
                        nextPrompt: nextTask.prompt,
                        promptLabel: buildPromptLabelForDisplay(nextTask.prompt.file, nextTask.prompt.section),
                        isRichUiEnabled: Boolean(this.terminalUi),
                        uiHandle: this.terminalUi,
                        waitForRequestedPause: async (checkpoint) => {
                            this.options.signal?.throwIfAborted();
                            this.state.updateJob(claim.id, { reason: checkpoint.statusMessage });
                            this.terminalUi?.state.setStatusMessage(checkpoint.statusMessage);
                            // Pause never strands an already-running operation with a repository lease. It prevents new claims.
                            if (checkpoint.phase === 'running' || checkpoint.phase === 'verifying')
                                await $assertSufficientFreeDiskSpace(workspace.projectPath);
                        },
                    });
                    const commit = await executeWorkspaceGit(workspace.repositoryRoot!, ['rev-parse', 'HEAD']).catch(
                        () => undefined,
                    );
                    this.state.updateJob(claim.id, {
                        status: 'completed',
                        commit: runOptions.noCommit ? undefined : commit,
                        reason: runOptions.noCommit
                            ? 'Saved without a commit by explicit configuration.'
                            : 'Implementation committed locally.',
                    });
                    this.state.updateControl({
                        lastAgentId: claim.agentId,
                        isWaitingSkipRequested: false,
                        nextJobAt: Math.max(
                            startedAt + this.options.waitBetweenPrompts,
                            Date.now() + this.options.waitAfterPrompt,
                        ),
                    });
                    await this.synchronization.synchronize(false, true);
                    await this.collection.reconcile();
                } catch (error) {
                    this.state.updateControl({ isWaitingSkipRequested: false });
                    const reason = error instanceof Error ? error.message : String(error);
                    this.state.updateJob(claim.id, {
                        status: isVerified || this.options.signal?.aborted ? 'recovery' : 'failed',
                        reason,
                    });
                    console.error(`Workspace job ${claim.path}: ${reason}`);
                }
            });
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            if (!(error instanceof ConflictError)) console.error(`Workspace supervision: ${reason}`);
            this.state.updateControl({ reason });
        } finally {
            this.isTickRunning = false;
        }
    }

    /** Rebuilds readiness for all priorities and Books, preserving failed/completed/recovery records. */
    private async discoverTasks(): Promise<EligibleWorkspaceTask[]> {
        const projectPath = this.options.workspace!.projectPath;
        const agents = await this.collection.listWorkspaceAgents();
        const files = await loadPromptFiles(join(projectPath, 'prompts'), { isMissingDirectoryAllowed: true });
        const configuration = await loadWorkspaceExecutionConfiguration(projectPath, {
            harness: this.options.agentName,
            model: this.options.model,
            thinkingLevel: this.options.thinkingLevel,
        });
        const entries: EligibleWorkspaceTask[] = [];
        const observedIds = new Set<string>();
        for (const prompt of listRunnablePrompts(files, this.options.priorityFilter ?? {})) {
            const path = relative(projectPath, prompt.file.path).replace(/\\/gu, '/');
            const id = hashWorkspaceSource(`${path}#${prompt.section.index}`);
            const selection = await selectWorkspaceTask({
                projectPath,
                prompt,
                agents,
                configuration,
                availableHarnesses: this.availableHarnesses,
                agentFilter: this.options.agentFilter,
            });
            const prerequisiteReason = await this.checkPrerequisites(prompt);
            const reason = prerequisiteReason ?? selection.reason;
            const job: WorkspaceJob = {
                id,
                path,
                section: prompt.section.index,
                priority: prompt.section.priority,
                status: reason ? 'blocked' : 'ready',
                agentId: selection.agent?.id,
                agentName: selection.agent?.name,
                harness: selection.harness,
                model: selection.model,
                reason,
                updatedAt: new Date().toISOString(),
            };
            this.state.discoverJob(job);
            observedIds.add(id);
            const persisted = this.state.listJobs().find((candidate) => candidate.id === id)!;
            entries.push({ job: persisted, prompt, selection });
        }
        for (const job of this.state.listJobs()) {
            if (['ready', 'blocked'].includes(job.status) && !observedIds.has(job.id))
                this.state.updateJob(job.id, {
                    status: 'blocked',
                    reason: 'PRD was removed, completed, made not-ready or excluded by the queue filter.',
                });
        }
        return entries;
    }

    /** Highest priority first; rotate eligible agents at that priority, then choose their first path/section. */
    private selectFairTask(tasks: EligibleWorkspaceTask[]): EligibleWorkspaceTask | undefined {
        const ready = tasks.filter(({ job }) => job.status === 'ready');
        const highestPriority = Math.max(...ready.map(({ job }) => job.priority));
        const candidates = ready.filter(({ job }) => job.priority === highestPriority);
        const agentIds = Array.from(new Set(candidates.map(({ job }) => job.agentId!))).sort();
        const lastAgentId = this.state.getControl().lastAgentId;
        const selectedId = agentIds[(agentIds.indexOf(lastAgentId ?? '') + 1) % agentIds.length];
        return candidates
            .filter(({ job }) => job.agentId === selectedId)
            .sort(
                (left, right) => left.job.path.localeCompare(right.job.path) || left.job.section - right.job.section,
            )[0];
    }

    /** Explicit prerequisite links require every referenced section to be done, including successful verification. */
    private async checkPrerequisites(prompt: PromptSelection): Promise<string | undefined> {
        for (const line of prompt.file.lines.slice(prompt.section.startLine, prompt.section.endLine + 1)) {
            if (!/^\s*(?:-\s*)?(?:blocking\s+)?prerequisites?\s*:/iu.test(line)) continue;
            for (const match of line.matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/gu)) {
                const path = resolve(dirname(prompt.file.path), match[1]!);
                if (!path.startsWith(join(this.options.workspace!.projectPath, 'prompts') + '/'))
                    return 'Prerequisite link is outside the project prompt queue.';
                const content = await readFile(path, 'utf-8').catch(() => null);
                const prerequisitePath = relative(this.options.workspace!.projectPath, path).replace(/\\/gu, '/');
                if (
                    this.state
                        .listJobs()
                        .some(
                            (job) =>
                                job.path === prerequisitePath && ['failed', 'recovery', 'running'].includes(job.status),
                        )
                )
                    return `Prerequisite ${match[1]} has unfinished verification or recovery; its status marker alone is insufficient.`;
                if (!content || parsePromptFile(path, content).sections.some((section) => section.status !== 'done'))
                    return `Prerequisite ${match[1]} has not completed successfully.`;
            }
        }
        return undefined;
    }

    /** Never blindly repeat an interrupted external invocation; reconcile files and commits first. */
    private async recoverClaims(): Promise<void> {
        for (const job of this.state.listJobs().filter((candidate) => candidate.status === 'running')) {
            const content = await readFile(join(this.options.workspace!.projectPath, job.path), 'utf-8').catch(
                () => null,
            );
            const section = content
                ? parsePromptFile(job.path, content).sections.find((candidate) => candidate.index === job.section)
                : undefined;
            if (section?.status === 'done') {
                const commit = await executeWorkspaceGit(this.options.workspace!.repositoryRoot!, [
                    'log',
                    '-1',
                    '--format=%H',
                    '--',
                    relative(
                        this.options.workspace!.repositoryRoot!,
                        join(this.options.workspace!.projectPath, job.path),
                    ),
                ]).catch(() => '');
                const dirty = await executeWorkspaceGit(this.options.workspace!.repositoryRoot!, [
                    'status',
                    '--porcelain',
                    '--',
                    join(this.options.workspace!.projectPath, job.path),
                ]);
                this.state.updateJob(job.id, {
                    status: commit && !dirty ? 'completed' : 'recovery',
                    commit: commit || undefined,
                    reason:
                        commit && !dirty
                            ? 'Completed source and its existing local commit reconciled after restart.'
                            : 'Implementation finished before interruption; local changes need review/commit, not re-execution.',
                });
            } else
                this.state.updateJob(job.id, {
                    status: 'recovery',
                    reason: 'Worker was interrupted. Review its source snapshot, PRD status and local changes before explicitly retrying.',
                });
        }
    }
}

// Note: [🟡] Workspace supervisor is only published in `@promptbook/cli`.
