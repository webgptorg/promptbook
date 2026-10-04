import colors from 'colors';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { buildTemporaryPromptScriptPath } from '../common/runGoScript/buildTemporaryPromptScriptPath';
import { runPromptCheckCommand } from './runPromptCheckCommand';

/**
 * Result of the aggregate check command executed before coding starts.
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
 * Runs the configured aggregate check before the first coding prompt.
 */
export async function runCheckBefore(options: {
    readonly checkCommand: string;
    readonly projectPath: string;
    readonly waitForPauseCheckpoint?: WaitForCoderRunPauseCheckpoint;
    readonly runPromptCheckCommandExecutor?: typeof runPromptCheckCommand;
}): Promise<CheckBeforeResult> {
    const runPromptCheckCommandExecutor = options.runPromptCheckCommandExecutor ?? runPromptCheckCommand;
    const initialCheckStatusMessage = `Running initial check before the agent coding starts: ${options.checkCommand}`;

    await options.waitForPauseCheckpoint?.({
        checkpointLabel: 'running initial check before the agent coding starts',
        phase: 'checking',
        statusMessage: initialCheckStatusMessage,
    });
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
        });

        console.info(colors.green('Pre-coding check passed.'));
        return { isPassed: true, checkOutput };
    } catch (error) {
        const checkOutput = formatUnknownErrorMessage(error);
        console.error(colors.red('Pre-coding check failed.'));
        console.error(checkOutput);
        return { isPassed: false, checkOutput };
    }
}
