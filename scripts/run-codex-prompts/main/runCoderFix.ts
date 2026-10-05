import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import type { WorkspaceRepositoryContext } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { CODER_DEFAULT_AGENT_BOOK_PATHS } from '../../../src/cli/cli-commands/coder/coderAgentRole';
import { validateCoderRunOptions } from '../../../src/cli/cli-commands/common/validateCoderRunOptions';
import type { NormalizedQuestionsCliOptions } from '../../../src/cli/cli-commands/common/questionsCliOptions';
import { $ensureHarnessInstallations } from '../../../src/cli/cli-commands/common/harness/$ensureHarnessInstallations';
import { $ensureCoderHarnessGitignoreRules } from '../../../src/cli/cli-commands/coder/$ensureCoderHarnessGitignoreRules';
import type { NormalizedPromptRunnerCliOptions } from '../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import type { ResolvedCoderProjectContext } from '../common/resolveCoderProjectContext';
import { createFreeDiskSpaceGuard } from '../common/createFreeDiskSpaceGuard';
import { withCoderWorkspaceLock } from '../common/withCoderWorkspaceLock';
import { runCoderCheckRepair, type CoderCheckRepairResult } from '../checks/runCoderCheckRepair';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { pullLatestChanges } from '../git/pullLatestChanges';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { renderCoderRunUi } from '../ui/renderCoderRunUi';
import { prepareCoderPromptExecution } from './prepareCoderPromptExecution';
import { resolveRunnerModel } from './resolvePromptRunner';
import { runPromptRound } from './runPromptRound';
import { buildCoderCheckRepairUiFrame } from '../ui/buildCoderCheckRepairUiFrame';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { EnvironmentMismatchError } from '../../../src/errors/EnvironmentMismatchError';
import { formatLowFreeDiskSpaceWarning } from '../../../src/cli/cli-commands/common/disk-space/formatLowFreeDiskSpaceWarning';

/** Resolved finite check-repair inputs. Queue limits, filters and keep-alive state are intentionally absent. */
export type CoderFixOptions = NormalizedPromptRunnerCliOptions &
    NormalizedQuestionsCliOptions & {
        readonly workspace: WorkspaceRepositoryContext;
        readonly projectContext: ResolvedCoderProjectContext;
        readonly dryRun: boolean;
        readonly checkCommand: string;
        readonly agent?: string;
        readonly context?: string;
        readonly preserveLogs: boolean;
        readonly waitAfterError: number;
        readonly signal?: AbortSignal;
    };

/** Validates fix's shared execution policy without exposing a queue-mode or interrupted-backlog escape hatch. */
export function validateCoderFixOptions(options: Omit<CoderFixOptions, 'workspace' | 'projectContext'>): void {
    validateCoderRunOptions({
        ...options,
        waitForUser: false,
        checkBefore: 'yes-and-fix',
        autoMigrate: false,
        allowDestructiveAutoMigrate: false,
    });
}

/**
 * Checks and repairs one project, then returns an explicit outcome. No ordinary queue module is loaded or called.
 * Both initial verification and repair use the very same service used by run's check-before phase.
 */
export async function runCoderFix(providedOptions: CoderFixOptions): Promise<CoderCheckRepairResult> {
    const controller = new AbortController();
    const options = { ...providedOptions, signal: controller.signal };
    validateCoderFixOptions(options);
    const projectPath = options.workspace.projectPath;
    if (options.dryRun) {
        const resolvedModel = options.agentName ? resolveRunnerModel(options.agentName, options.model) : options.model;
        console.info(
            spaceTrim(`
            Dry-run: check/repair project \`${projectPath}\`.
            Check: \`${options.checkCommand}\`.
            Repair Book: \`${options.agent ?? CODER_DEFAULT_AGENT_BOOK_PATHS.developer}\`.
            Context: ${
                options.context === undefined ? 'project AGENTS.md (when present)' : 'explicit --context override'
            }.
            Harness: ${options.agentName ?? '(select --harness before execution)'}; model: ${
                resolvedModel ?? '(harness configured model)'
            }.
            Run the check first. On failure, author one repair PRD and verify that exact repair with the same check.
            ${options.noCommit ? 'Leave eligible changes uncommitted.' : 'Commit only eligible check/repair changes.'}
            ${options.autoPull ? 'Pull before checks.' : ''} ${options.autoPush ? 'Push created commits.' : ''}
            Exit after this job; ordinary PRDs are never selected.
            No checks, agents, installations, artifacts, statuses or Git mutations run in this preview.
        `),
        );
        return { kind: 'skipped', isCheckPassed: false };
    }
    /** Forwards caller cancellation into the same owned lifecycle used by terminal Ctrl+C. */
    const forwardCancellation = () => controller.abort(providedOptions.signal?.reason);
    providedOptions.signal?.addEventListener('abort', forwardCancellation, { once: true });
    if (providedOptions.signal?.aborted) forwardCancellation();
    try {
        if (!options.workspace.repositoryRoot || !options.workspace.gitDirectory) {
            throw new EnvironmentMismatchError(
                spaceTrim(`
                Check repair requires a Git working tree for project \`${projectPath}\`.
                Run \`ptbk init\`, \`ptbk coder init\` or \`git init\` before retrying.
                No checks or project mutations were started.
            `),
            );
        }
        return await withCoderWorkspaceLock(options.workspace, async () => {
            options.signal?.throwIfAborted();
            if (options.autoPull) {
                // Pull can mutate the tree too: apply the shared dirty policy before requesting it.
                if (options.gitChanges !== 'ignore') await ensureWorkingTreeClean(options.workspace.repositoryRoot);
                try {
                    await pullLatestChanges(options.workspace.repositoryRoot, { signal: options.signal });
                } catch (error) {
                    throw new CoderGitOperationError('pull', error instanceof Error ? error.message : String(error));
                }
            }
            const isRichUiEnabled = !options.noUi && Boolean(process.stdout.isTTY);
            const uiHandle = isRichUiEnabled
                ? renderCoderRunUi(moment(), {
                      buildFrameLines: buildCoderCheckRepairUiFrame,
                      isQueueControlsEnabled: false,
                      onInterrupt: () =>
                          controller.abort(new NotAllowed('Check repair interrupted; recoverable work was preserved.')),
                  })
                : undefined;
            uiHandle?.state.setCurrentPrompt('Project checks and repair');
            uiHandle?.state.setConfig({ agentName: 'Check repair', checkCommand: options.checkCommand });
            let criticalDiskSpaceError: EnvironmentMismatchError | undefined;
            const guardFreeDiskSpace = createFreeDiskSpaceGuard({
                inspectedPath: projectPath,
                isAskingQuestionsEnabled: options.isAskingQuestionsEnabled,
                onCriticalDiskSpace: async (status) => {
                    criticalDiskSpaceError = new EnvironmentMismatchError(
                        spaceTrim(`
                        Check repair stopped because the project filesystem is critically full.
                        ${formatLowFreeDiskSpaceWarning(status)}
                        Free disk space and recover the saved repair before retrying.
                    `),
                    );
                    throw criticalDiskSpaceError;
                },
            });
            const waitForPauseCheckpoint: WaitForCoderRunPauseCheckpoint = async (checkpoint) => {
                options.signal.throwIfAborted();
                if (checkpoint.phase !== 'error') {
                    if (criticalDiskSpaceError) throw criticalDiskSpaceError;
                    await guardFreeDiskSpace();
                }
                uiHandle?.state.setPhase(checkpoint.phase);
                uiHandle?.state.setStatusMessage(checkpoint.statusMessage);
            };
            try {
                const result = await runCoderCheckRepair({
                    projectPath,
                    workspace: options.workspace,
                    checkCommand: options.checkCommand,
                    mode: 'yes-and-fix',
                    intent: 'fix',
                    isCommitEnabled: !options.noCommit,
                    isAutoPushEnabled: options.autoPush,
                    isWorkingTreeCleanRequired: options.gitChanges !== 'ignore',
                    preserveLogs: options.preserveLogs,
                    signal: options.signal,
                    waitForPauseCheckpoint,
                    onInitialCheckStarted: () => uiHandle?.startCapturingAgentOutput(),
                    onInitialCheckFinished: () => uiHandle?.stopCapturingAgentOutput(),
                    prepareRepair: async () => {
                        options.signal?.throwIfAborted();
                        await $ensureHarnessInstallations([options.agentName], options, { isRequired: true });
                        options.signal?.throwIfAborted();
                        await $ensureCoderHarnessGitignoreRules(projectPath, options.agentName, options);
                        const execution = await prepareCoderPromptExecution(
                            { ...options, projectPath },
                            {
                                isCommittingInitializedBooks: false,
                                signal: options.signal,
                            },
                        );
                        return async (repairPrompt, commitScope) => {
                            await runPromptRound({
                                options: {
                                    ...options,
                                    projectPath,
                                    waitForUser: false,
                                    autoMigrate: false,
                                    allowDestructiveAutoMigrate: false,
                                },
                                runner: execution.runner,
                                runnerMetadata: execution.runnerMetadata,
                                nextPrompt: repairPrompt,
                                promptLabel: buildPromptLabelForDisplay(
                                    repairPrompt.file,
                                    repairPrompt.section,
                                    projectPath,
                                ),
                                resolvedCoderContext: options.projectContext.context,
                                resolvedAgentSystemMessage: execution.resolvedCoderAgent?.systemMessage,
                                isRichUiEnabled,
                                uiHandle,
                                commitScope,
                                signal: options.signal,
                                waitForRequestedPause: waitForPauseCheckpoint,
                            });
                        };
                    },
                });
                return result;
            } finally {
                uiHandle?.stopCapturingAgentOutput();
                uiHandle?.cleanup();
            }
        });
    } catch (error) {
        return {
            kind: options.signal?.aborted
                ? 'interrupted'
                : error instanceof CoderGitOperationError
                ? 'persistence-error'
                : 'setup-error',
            isCheckPassed: false,
            error,
        };
    } finally {
        providedOptions.signal?.removeEventListener('abort', forwardCancellation);
    }
}
