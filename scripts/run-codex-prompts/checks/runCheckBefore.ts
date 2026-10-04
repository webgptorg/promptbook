import colors from 'colors';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { buildTemporaryPromptScriptPath } from '../common/runGoScript/buildTemporaryPromptScriptPath';
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
}): Promise<CheckBeforeResult> {
    options.signal?.throwIfAborted();
    const runPromptCheckCommandExecutor = options.runPromptCheckCommandExecutor ?? runPromptCheckCommand;
    const initialCheckStatusMessage = `Running initial checks before the agent coding starts: ${options.checkCommand}`;

    await options.waitForPauseCheckpoint?.({
        checkpointLabel: 'running initial checks before the agent coding starts',
        phase: 'verifying',
        statusMessage: initialCheckStatusMessage,
    });
    options.signal?.throwIfAborted();
    console.info(colors.gray(initialCheckStatusMessage));

    try {
        const checkOutput = await runPromptCheckCommandExecutor({
            command: options.checkCommand,
            projectPath: options.projectPath,
            scriptPath: buildTemporaryPromptScriptPath({
                projectPath: options.projectPath,
                scriptDirectoryName: 'coder-prompts',
                sourceFileName: 'check-before',
            }),
            ...(options.signal ? { signal: options.signal } : {}),
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
