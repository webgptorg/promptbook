import colors from 'colors';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { buildTemporaryPromptScriptPath } from '../common/runGoScript/buildTemporaryPromptScriptPath';
import { runPromptTestCommand } from './runPromptTestCommand';

/**
 * Result of the verification command executed before coding starts.
 */
export type TestBeforeResult = {
    /**
     * Whether the verification command completed successfully.
     */
    readonly isPassed: boolean;
    /**
     * Combined output produced by the verification command.
     */
    readonly testOutput: string;
};

/**
 * Runs the configured verification command before the first coding prompt.
 */
export async function runTestBefore(options: {
    readonly testCommand: string;
    readonly projectPath: string;
    readonly waitForPauseCheckpoint?: WaitForCoderRunPauseCheckpoint;
    readonly runPromptTestCommandExecutor?: typeof runPromptTestCommand;
}): Promise<TestBeforeResult> {
    const runPromptTestCommandExecutor = options.runPromptTestCommandExecutor ?? runPromptTestCommand;
    const initialTestStatusMessage = `Running initial tests before the agent coding starts: ${options.testCommand}`;

    await options.waitForPauseCheckpoint?.({
        checkpointLabel: 'running initial tests before the agent coding starts',
        phase: 'verifying',
        statusMessage: initialTestStatusMessage,
    });
    console.info(colors.gray(initialTestStatusMessage));

    try {
        const testOutput = await runPromptTestCommandExecutor({
            command: options.testCommand,
            projectPath: options.projectPath,
            scriptPath: buildTemporaryPromptScriptPath({
                projectPath: options.projectPath,
                scriptDirectoryName: 'coder-prompts',
                sourceFileName: 'test-before',
            }),
        });

        console.info(colors.green('Pre-coding tests passed.'));
        return { isPassed: true, testOutput };
    } catch (error) {
        const testOutput = formatUnknownErrorMessage(error);
        console.error(colors.red('Pre-coding tests failed.'));
        console.error(testOutput);
        return { isPassed: false, testOutput };
    }
}
