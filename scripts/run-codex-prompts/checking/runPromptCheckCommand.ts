import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { $runGoScriptWithOutput } from '../common/runGoScript/$runGoScriptWithOutput';
import { toPosixPath } from '../common/runGoScript/toPosixPath';

/**
 * Options for running one aggregate check command after a coding attempt.
 */
export type RunPromptCheckCommandOptions = {
    command: string;
    projectPath: string;
    scriptPath: string;
    logPath?: string;
    preserveArtifactsOnSuccess?: boolean;
};

/**
 * Runs the configured aggregate check inside the project root and returns its output.
 */
export async function runPromptCheckCommand(options: RunPromptCheckCommandOptions): Promise<string> {
    const projectPath = toPosixPath(options.projectPath);

    return await $runGoScriptWithOutput({
        scriptPath: options.scriptPath,
        scriptContent: spaceTrim(`
            cd "${projectPath}"
            ${options.command}
        `),
        logPath: options.logPath,
        preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
    });
}
