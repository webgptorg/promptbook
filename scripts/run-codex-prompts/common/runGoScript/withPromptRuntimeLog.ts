import { unlink } from 'fs/promises';
import { buildScriptLogPath } from './buildScriptLogPath';
import { shouldDeleteTemporaryArtifact } from './shouldDeleteTemporaryArtifact';

/**
 * Runs one prompt-processing round with a dedicated temporary runtime log file that is cleaned up only after successful non-preserved runs.
 */
export async function withPromptRuntimeLog<T>(
    scriptPath: string,
    handler: (logPath: string) => Promise<T>,
    options?: { preserveArtifactsOnSuccess?: boolean },
): Promise<T> {
    const logPath = buildScriptLogPath(scriptPath);
    let hasFailed = false;
    await unlink(logPath).catch(() => undefined);

    try {
        return await handler(logPath);
    } catch (error) {
        hasFailed = true;
        throw error;
    } finally {
        if (
            shouldDeleteTemporaryArtifact({
                preserveArtifactsOnSuccess: options?.preserveArtifactsOnSuccess,
                hasFailed,
            })
        ) {
            await unlink(logPath).catch(() => undefined);
        }
    }
}
