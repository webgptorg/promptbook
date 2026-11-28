import os from 'node:os';

import { DEFAULT_PROCESS_CPU_SAMPLE_DURATION_MS } from './resourceMonitorConstants';
import { waitForResourceMonitorSample } from './waitForResourceMonitorSample';
import type { CpuResourceUsage } from './resourceMonitorTypes';

/**
 * Options for reading CPU usage.
 */
type ReadCpuResourceUsageOptions = {
    /**
     * Whether the current Node.js process CPU usage should be sampled.
     */
    readonly isProcessUsageSampled: boolean;

    /**
     * Optional process CPU sampling duration.
     */
    readonly sampleDurationMs?: number;
};

/**
 * Reads platform load average and optionally samples current process CPU usage.
 *
 * @param options - CPU reader options.
 * @returns CPU usage snapshot.
 */
export async function readCpuResourceUsage({
    isProcessUsageSampled,
    sampleDurationMs = DEFAULT_PROCESS_CPU_SAMPLE_DURATION_MS,
}: ReadCpuResourceUsageOptions): Promise<CpuResourceUsage> {
    const coreCount = Math.max(os.cpus().length, 1);
    const isLoadAverageAvailable = process.platform !== 'win32';
    const [averageLoadOneMinute, averageLoadFiveMinutes, averageLoadFifteenMinutes] = isLoadAverageAvailable
        ? os.loadavg()
        : [null, null, null];
    const loadRatio = averageLoadOneMinute === null ? null : averageLoadOneMinute / coreCount;
    const processUsageRatio = isProcessUsageSampled
        ? await sampleProcessCpuUsageRatio(coreCount, sampleDurationMs)
        : null;

    return {
        coreCount,
        averageLoadOneMinute,
        averageLoadFiveMinutes,
        averageLoadFifteenMinutes,
        loadRatio,
        processUsageRatio,
    };
}

/**
 * Samples current Node.js process CPU usage over a short interval.
 *
 * @param coreCount - Logical CPU core count.
 * @param sampleDurationMs - Sampling duration in milliseconds.
 * @returns Process CPU ratio across all logical cores.
 */
async function sampleProcessCpuUsageRatio(coreCount: number, sampleDurationMs: number): Promise<number | null> {
    const startedUsage = process.cpuUsage();
    const startedAtNanoseconds = process.hrtime.bigint();

    await waitForResourceMonitorSample(sampleDurationMs);

    const elapsedMicroseconds = Number(process.hrtime.bigint() - startedAtNanoseconds) / 1000;
    if (!Number.isFinite(elapsedMicroseconds) || elapsedMicroseconds <= 0) {
        return null;
    }

    const usage = process.cpuUsage(startedUsage);
    const usedMicroseconds = usage.user + usage.system;
    const processUsageRatio = usedMicroseconds / elapsedMicroseconds / Math.max(coreCount, 1);

    return Number.isFinite(processUsageRatio) ? Math.max(processUsageRatio, 0) : null;
}
