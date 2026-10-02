import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { $runGoScriptWithOutput } from '../common/runGoScript/$runGoScriptWithOutput';
import { toPosixPath } from '../common/runGoScript/toPosixPath';

/**
 * Options for running one verification command after a coding attempt.
 */
export type RunPromptTestCommandOptions = {
    /** Cancels this verification process only. */
    readonly signal?: AbortSignal;
    /** Project-scoped subprocess environment. */
    readonly environment?: NodeJS.ProcessEnv;
    command: string;
    projectPath: string;
    scriptPath: string;
    logPath?: string;
    preserveArtifactsOnSuccess?: boolean;
};

/**
 * Runs the configured verification command inside the project root and returns its output.
 */
export async function runPromptTestCommand(options: RunPromptTestCommandOptions): Promise<string> {
    const projectPath = toPosixPath(options.projectPath);

    return await $runGoScriptWithOutput({
        projectPath: options.projectPath,
        signal: options.signal,
        environment: options.environment,
        scriptPath: options.scriptPath,
        scriptContent: spaceTrim(`
            cd "${projectPath}"
            ${options.command}
        `),
        logPath: options.logPath,
        preserveArtifactsOnSuccess: options.preserveArtifactsOnSuccess,
    });
}
