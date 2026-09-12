import { statfs } from 'fs/promises';
import type { FreeDiskSpaceStatus } from './FreeDiskSpaceStatus';
import { resolveFreeDiskSpaceLevel } from './resolveFreeDiskSpaceLevel';

/**
 * Measures the free disk space on the filesystem which hosts the given path.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads the state of the filesystem
 *
 * @returns the measurement, or `null` when the filesystem can not be measured, for example on a platform which
 *          does not report filesystem statistics - a run is never stopped by a measurement which could not be taken
 * @private internal utility of `promptbookCli`
 */
export async function $readFreeDiskSpaceStatus(inspectedPath: string): Promise<FreeDiskSpaceStatus | null> {
    try {
        const fileSystemStats = await statfs(inspectedPath);
        const blockSizeBytes = fileSystemStats.bsize;
        const availableBytes = fileSystemStats.bavail * blockSizeBytes;
        const totalBytes = fileSystemStats.blocks * blockSizeBytes;

        if (!Number.isFinite(availableBytes) || availableBytes < 0) {
            return null;
        }

        return {
            inspectedPath,
            availableBytes,
            totalBytes,
            level: resolveFreeDiskSpaceLevel(availableBytes),
        };
    } catch {
        // Note: A path or a platform which can not report its free disk space must not stop `ptbk coder` from running
        return null;
    }
}

// Note: [🟡] Code for CLI free disk space handling [$readFreeDiskSpaceStatus](src/cli/cli-commands/common/disk-space/$readFreeDiskSpaceStatus.ts) should never be published outside of `@promptbook/cli`
