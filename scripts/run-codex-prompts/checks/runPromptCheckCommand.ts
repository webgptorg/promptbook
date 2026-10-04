import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { $runGoScriptWithOutput } from '../common/runGoScript/$runGoScriptWithOutput';
import { toPosixPath } from '../common/runGoScript/toPosixPath';
import { quoteBashArgument } from '../common/runGoScript/quoteBashArgument';
import { assertProjectCheckIsConfigured } from './projectCheck';

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
}
