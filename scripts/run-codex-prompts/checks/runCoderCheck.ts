import { formatUnknownErrorDetails } from '../common/formatUnknownErrorDetails';
import type { CoderPhasePersistence } from '../git/CoderPhasePersistence';
import { CoderCheckExecutionError } from './CoderCheckExecutionError';
import type { CoderCheckOutcome } from './CoderCheckOutcome';
import { CoderCheckSetupError } from './projectCheck';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { runPromptCheckCommand, type RunPromptCheckCommandOptions } from './runPromptCheckCommand';

/** Typed execution result separate from persistence, usable by initial checks and bounded check feedback. */
export type CoderCheckResult = { readonly outcome: CoderCheckOutcome };

/**
 * Executes one selected command, captures its content/index boundaries and persists its actual transformation.
 * Persistence errors escape this service and must never be mistaken for check failures or model feedback.
 */
export async function runCoderCheck(
    options: RunPromptCheckCommandOptions & {
        readonly phase: 'pre-coding' | 'post-implementation';
        readonly attempt?: number;
        readonly persistence?: CoderPhasePersistence;
        readonly executor?: typeof runPromptCheckCommand;
    },
): Promise<CoderCheckResult> {
    await options.persistence?.assertWritablePaths([options.scriptPath, ...(options.logPath ? [options.logPath] : [])]);
    const before = await options.persistence?.beforeCheck();
    const executor = options.executor ?? runPromptCheckCommand;
    /** Converts only execution errors; errors from phase ownership/persistence bypass check feedback. */
    const execute = async (projectPath = options.projectPath): Promise<CoderCheckOutcome> => {
        try {
            const output = await executor({
                command: options.command,
                projectPath,
                scriptPath: options.scriptPath,
                logPath: options.logPath,
                preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
                signal: options.signal,
            });
            options.signal?.throwIfAborted();
            return { kind: 'passed', output };
        } catch (error) {
            return {
                kind: options.signal?.aborted
                    ? 'interrupted'
                    : error instanceof CoderCheckExecutionError || error instanceof CoderCheckSetupError
                    ? 'execution-error'
                    : 'failed',
                output: formatUnknownErrorDetails(error),
                error,
            };
        }
    };
    const result = options.persistence ? await options.persistence.mutateCheck(execute) : await execute();
    if (before) {
        try {
            await options.persistence!.afterCheck({
                before,
                phase: options.phase,
                command: options.command,
                outcome: result,
                attempt: options.attempt,
            });
        } catch (error) {
            if (error instanceof CoderGitOperationError) error.checkOutcome = result.kind;
            throw error;
        }
    }
    if (result.kind === 'interrupted' || result.kind === 'execution-error') throw result.error;
    return { outcome: result };
}
