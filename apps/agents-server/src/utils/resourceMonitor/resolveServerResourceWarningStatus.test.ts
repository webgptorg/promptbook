import { resolveServerResourceWarningStatus } from './resolveServerResourceWarningStatus';
import type { CpuResourceUsage, DiskResourceUsage, MemoryResourceUsage } from './resourceMonitorTypes';

/**
 * Healthy CPU fixture.
 */
const HEALTHY_CPU: CpuResourceUsage = {
    coreCount: 4,
    averageLoadOneMinute: 1,
    averageLoadFiveMinutes: 1,
    averageLoadFifteenMinutes: 1,
    loadRatio: 0.25,
    processUsageRatio: null,
};

/**
 * Healthy memory fixture.
 */
const HEALTHY_MEMORY: MemoryResourceUsage = {
    totalBytes: 16 * 1024 * 1024 * 1024,
    freeBytes: 8 * 1024 * 1024 * 1024,
    usedBytes: 8 * 1024 * 1024 * 1024,
    usedRatio: 0.5,
    availableRatio: 0.5,
    processRssBytes: 512 * 1024 * 1024,
    processHeapUsedBytes: 128 * 1024 * 1024,
    processHeapTotalBytes: 256 * 1024 * 1024,
    processExternalBytes: 32 * 1024 * 1024,
    processArrayBuffersBytes: 8 * 1024 * 1024,
};

/**
 * Healthy disk fixture.
 */
const HEALTHY_DISK: DiskResourceUsage = {
    inspectedPath: '/srv/promptbook',
    totalBytes: 100 * 1024 * 1024 * 1024,
    freeBytes: 60 * 1024 * 1024 * 1024,
    availableBytes: 60 * 1024 * 1024 * 1024,
    usedBytes: 40 * 1024 * 1024 * 1024,
    usedRatio: 0.4,
    availableRatio: 0.6,
    errorMessage: null,
};

describe('resolveServerResourceWarningStatus', () => {
    it('returns an OK status for healthy resources', () => {
        const status = resolveServerResourceWarningStatus({
            cpu: HEALTHY_CPU,
            memory: HEALTHY_MEMORY,
            disk: HEALTHY_DISK,
        });

        expect(status.isWarningShown).toBe(false);
        expect(status.issues).toEqual([]);
        expect(status.warningMessages).toEqual([]);
    });

    it('reports CPU, memory, and disk pressure', () => {
        const status = resolveServerResourceWarningStatus({
            cpu: {
                ...HEALTHY_CPU,
                averageLoadOneMinute: 4,
                loadRatio: 1,
            },
            memory: {
                ...HEALTHY_MEMORY,
                freeBytes: 512 * 1024 * 1024,
                availableRatio: 0.03125,
            },
            disk: {
                ...HEALTHY_DISK,
                availableBytes: 512 * 1024 * 1024,
                availableRatio: 0.005,
            },
        });

        expect(status.isWarningShown).toBe(true);
        expect(status.issues.map((issue) => issue.resource)).toEqual(['cpu', 'memory', 'disk']);
        expect(status.warningMessages).toHaveLength(3);
    });

    it('does not report unavailable disk metrics as resource pressure', () => {
        const status = resolveServerResourceWarningStatus({
            cpu: HEALTHY_CPU,
            memory: HEALTHY_MEMORY,
            disk: {
                inspectedPath: '/srv/promptbook',
                totalBytes: null,
                freeBytes: null,
                availableBytes: null,
                usedBytes: null,
                usedRatio: null,
                availableRatio: null,
                errorMessage: 'statfs unavailable',
            },
        });

        expect(status.isWarningShown).toBe(false);
    });
});
