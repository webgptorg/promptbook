import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { $runGoScriptWithOutput } from '../common/runGoScript/$runGoScriptWithOutput';
import { toPosixPath } from '../common/runGoScript/toPosixPath';
import { quoteBashArgument } from '../common/runGoScript/quoteBashArgument';
import { assertProjectCheckIsConfigured, CoderCheckSetupError } from './projectCheck';
import { CoderCheckExecutionError } from './CoderCheckExecutionError';

/**
 * Options for running one check command after a coding attempt.
 */
export type RunPromptCheckCommandOptions = {
    command: string;
    projectPath: string;
    scriptPath: string;
    logPath?: string;
    preserveArtifactsOnSuccess?: boolean;
    /** Cancels the same shared shell runner used for other Coder processes. */
    signal?: AbortSignal;
};

/**
 * Runs the configured check command inside the project root and returns its output.
 */
export async function runPromptCheckCommand(options: RunPromptCheckCommandOptions): Promise<string> {
    await assertProjectCheckIsConfigured(options.command, options.projectPath);
    const projectPath = toPosixPath(options.projectPath);

    try {
        return await $runGoScriptWithOutput({
            scriptPath: options.scriptPath,
            projectPath: options.projectPath,
            scriptContent: spaceTrim(`
            cd ${quoteBashArgument(projectPath)} || exit 1
            ${options.command}
        `),
            logPath: options.logPath,
            preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
            signal: options.signal,
        });
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        if (!options.signal?.aborted && /exited with code 127/iu.test(details) && /command not found/iu.test(details)) {
            throw new CoderCheckSetupError(
                `the selected check command is unavailable. Install/configure its project tools before retrying.\n\n${details}`,
            );
        }
        if (!options.signal?.aborted && !/exited with code \d+(?:\.|\s)/iu.test(details)) {
            throw new CoderCheckExecutionError(options.command, details);
        }
        throw error;
    }
}
