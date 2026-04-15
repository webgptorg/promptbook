import { unlink } from 'fs/promises';
import { buildScriptLogPath } from './buildScriptLogPath';
import type { PromptRoundArtifacts } from './PromptRoundArtifacts';

/**
 * Runs one prompt-processing round with a dedicated temporary runtime log file and optionally defers cleanup to the round tracker.
 */
export async function withPromptRuntimeLog<T>(
    scriptPath: string,
    handler: (logPath: string) => Promise<T>,
    promptRoundArtifacts?: PromptRoundArtifacts,
): Promise<T> {
    const logPath = buildScriptLogPath(scriptPath);
    await unlink(logPath).catch(() => undefined);
    promptRoundArtifacts?.track(logPath, 'runtime-log');

    try {
        return await handler(logPath);
    } finally {
        if (!promptRoundArtifacts) {
            await unlink(logPath).catch(() => undefined);
        }
    }
}
