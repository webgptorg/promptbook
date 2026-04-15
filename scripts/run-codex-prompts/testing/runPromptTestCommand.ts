import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { $runGoScriptWithOutput } from '../common/runGoScript/$runGoScriptWithOutput';
import { toPosixPath } from '../common/runGoScript/toPosixPath';

/**
 * Options for running one verification command after a coding attempt.
 */
type RunPromptTestCommandOptions = {
    command: string;
    projectPath: string;
    scriptPath: string;
    logPath?: string;
};

/**
 * Runs the configured verification command inside the project root and returns its output.
 */
export async function runPromptTestCommand(options: RunPromptTestCommandOptions): Promise<string> {
    const projectPath = toPosixPath(options.projectPath);

    return await $runGoScriptWithOutput({
        scriptPath: options.scriptPath,
        scriptContent: spaceTrim(`
            cd "${projectPath}"
            ${options.command}
        `),
        logPath: options.logPath,
    });
}
