import os from 'node:os';

import type { MemoryResourceUsage } from './resourceMonitorTypes';

/**
 * Reads current host and process memory usage.
 *
 * @returns Memory usage snapshot.
 */
export function readMemoryResourceUsage(): MemoryResourceUsage {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = Math.max(totalBytes - freeBytes, 0);
    const memoryUsage = process.memoryUsage();

    return {
        totalBytes,
        freeBytes,
        usedBytes,
        usedRatio: totalBytes > 0 ? usedBytes / totalBytes : 0,
        availableRatio: totalBytes > 0 ? freeBytes / totalBytes : 0,
        processRssBytes: memoryUsage.rss,
        processHeapUsedBytes: memoryUsage.heapUsed,
        processHeapTotalBytes: memoryUsage.heapTotal,
        processExternalBytes: memoryUsage.external,
        processArrayBuffersBytes: memoryUsage.arrayBuffers ?? 0,
    };
}
