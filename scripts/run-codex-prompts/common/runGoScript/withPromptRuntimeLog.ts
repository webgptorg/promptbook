import { unlink } from 'fs/promises';
import { buildScriptLogPath } from './buildScriptLogPath';

/**
 * Runs one prompt-processing round with a dedicated temporary runtime log file that is always cleaned up afterwards.
 */
export async function withPromptRuntimeLog<T>(
    scriptPath: string,
    handler: (logPath: string) => Promise<T>,
): Promise<T> {
    const logPath = buildScriptLogPath(scriptPath);
    await unlink(logPath).catch(() => undefined);

    try {
        return await handler(logPath);
    } finally {
        await unlink(logPath).catch(() => undefined);
    }
}
