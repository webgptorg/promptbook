import colors from 'colors';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { buildCheckBeforeScriptPath } from './buildCheckBeforeScriptPath';
import { runPromptCheckCommand } from './runPromptCheckCommand';
import { CoderCheckSetupError } from './projectCheck';

/**
 * Result of the check command executed before coding starts.
 */
export type CheckBeforeResult = {
    /**
     * Whether the check command completed successfully.
     */
    readonly isPassed: boolean;
    /**
     * Combined output produced by the check command.
     */
    readonly checkOutput: string;
};

/**
 * Runs the configured check command before the first coding prompt.
 */
export async function runCheckBefore(options: {
    readonly checkCommand: string;
    readonly projectPath: string;
    readonly waitForPauseCheckpoint?: WaitForCoderRunPauseCheckpoint;
    readonly runPromptCheckCommandExecutor?: typeof runPromptCheckCommand;
    /** Optional cancellation forwarded to the shared command runner. */
    readonly signal?: AbortSignal;
    /** Preserve the initial check's successful script under the same artifact policy as repair checks. */
    readonly preserveLogs?: boolean;
}): Promise<CheckBeforeResult> {
    options.signal?.throwIfAborted();
    const runPromptCheckCommandExecutor = options.runPromptCheckCommandExecutor ?? runPromptCheckCommand;
    const initialCheckStatusMessage = `Running initial checks before the agent coding starts: ${options.checkCommand}`;

    await options.waitForPauseCheckpoint?.({
        checkpointLabel: 'running initial checks before the agent coding starts',
        phase: 'checking',
        statusMessage: initialCheckStatusMessage,
    });
    options.signal?.throwIfAborted();
    console.info(colors.gray(initialCheckStatusMessage));

    try {
        const checkOutput = await runPromptCheckCommandExecutor({
            command: options.checkCommand,
            projectPath: options.projectPath,
            scriptPath: buildCheckBeforeScriptPath(options.projectPath),
            ...(options.signal ? { signal: options.signal } : {}),
            ...(options.preserveLogs ? { preserveArtifactsOnSuccess: true } : {}),
        });
        options.signal?.throwIfAborted();

        console.info(colors.green('Pre-coding checks passed.'));
        return { isPassed: true, checkOutput };
    } catch (error) {
        if (error instanceof CoderCheckSetupError || options.signal?.aborted) throw error;
        const checkOutput = formatUnknownErrorMessage(error);
        console.error(colors.red('Pre-coding checks failed.'));
        console.error(checkOutput);
        return { isPassed: false, checkOutput };
    }
}
