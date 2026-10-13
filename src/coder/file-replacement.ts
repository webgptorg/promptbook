import { promises as fs } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

/** Filesystem seams for bounded atomic replacement on Windows. @private */
export interface FileReplacementOptions {
    platform?: NodeJS.Platform;
    rename?: (source: string, destination: string) => Promise<void>;
    sleep?: (milliseconds: number) => Promise<void>;
}

/**
 * Publish the same complete candidate through transient Windows sharing violations.
 * Validate ownership immediately before each attempt, including after every wait.
 * Guard failures are never retried, and the destination is never deleted to force replacement.
 * @private
 */
export async function replaceFileWithRetry(
    temporary: string,
    destination: string,
    beforeAttempt?: () => Promise<void>,
    options: FileReplacementOptions = {},
): Promise<void> {
    for (let attempt = 0; ; attempt++) {
        await beforeAttempt?.();
        try {
            await (options.rename ?? fs.rename)(temporary, destination);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if ((options.platform ?? process.platform) !== 'win32'
                || !['EPERM', 'EBUSY', 'EACCES'].includes(code ?? '') || attempt >= 9) throw error;
            await (options.sleep ?? delay)(Math.min(20 * 2 ** attempt, 250));
        }
    }
}
