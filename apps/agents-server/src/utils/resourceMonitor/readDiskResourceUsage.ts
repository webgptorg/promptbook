import { statfs } from 'node:fs/promises';

import type { DiskResourceUsage } from './resourceMonitorTypes';

/**
 * Reads disk usage for the filesystem that hosts the server process.
 *
 * @param inspectedPath - Filesystem path to inspect.
 * @returns Disk usage snapshot.
 */
export async function readDiskResourceUsage(inspectedPath: string = process.cwd()): Promise<DiskResourceUsage> {
    try {
        const fileSystemStats = await statfs(inspectedPath);
        const blockSize = fileSystemStats.bsize;
        const totalBytes = fileSystemStats.blocks * blockSize;
        const freeBytes = fileSystemStats.bfree * blockSize;
        const availableBytes = fileSystemStats.bavail * blockSize;
        const usedBytes = Math.max(totalBytes - freeBytes, 0);

        return {
            inspectedPath,
            totalBytes,
            freeBytes,
            availableBytes,
            usedBytes,
            usedRatio: totalBytes > 0 ? usedBytes / totalBytes : null,
            availableRatio: totalBytes > 0 ? availableBytes / totalBytes : null,
            errorMessage: null,
        };
    } catch (error) {
        return {
            inspectedPath,
            totalBytes: null,
            freeBytes: null,
            availableBytes: null,
            usedBytes: null,
            usedRatio: null,
            availableRatio: null,
            errorMessage: error instanceof Error ? error.message : 'Disk usage is not available.',
        };
    }
}
