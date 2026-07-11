import {
    CPU_LOAD_WARNING_RATIO,
    DISK_AVAILABLE_WARNING_BYTES,
    DISK_AVAILABLE_WARNING_RATIO,
    MEMORY_AVAILABLE_WARNING_RATIO,
} from './resourceMonitorConstants';
import { formatResourceBytes, formatResourcePercentage } from './formatResourceMonitorValue';
import type {
    CpuResourceUsage,
    DiskResourceUsage,
    MemoryResourceUsage,
    ServerResourceWarningIssue,
    ServerResourceWarningStatus,
} from './resourceMonitorTypes';

/**
 * Inputs required to resolve resource warning status.
 */
type ResolveServerResourceWarningStatusOptions = {
    readonly cpu: CpuResourceUsage;
    readonly memory: MemoryResourceUsage;
    readonly disk: DiskResourceUsage;
};

/**
 * Resolves whether the server is low on operational resources.
 *
 * @param options - Current resource usage.
 * @returns Warning status for the header and monitor page.
 */
export function resolveServerResourceWarningStatus({
    cpu,
    memory,
    disk,
}: ResolveServerResourceWarningStatusOptions): ServerResourceWarningStatus {
    const issues: ServerResourceWarningIssue[] = [];

    if (cpu.loadRatio !== null && cpu.loadRatio >= CPU_LOAD_WARNING_RATIO) {
        issues.push({
            resource: 'cpu',
            message: `CPU load is ${formatResourcePercentage(cpu.loadRatio)} of ${cpu.coreCount} logical cores.`,
        });
    }

    if (memory.availableRatio <= MEMORY_AVAILABLE_WARNING_RATIO) {
        issues.push({
            resource: 'memory',
            message: `Free memory is ${formatResourcePercentage(memory.availableRatio)} (${formatResourceBytes(
                memory.freeBytes,
            )}) of ${formatResourceBytes(memory.totalBytes)}.`,
        });
    }

    if (
        disk.availableBytes !== null &&
        disk.availableRatio !== null &&
        (disk.availableRatio <= DISK_AVAILABLE_WARNING_RATIO || disk.availableBytes <= DISK_AVAILABLE_WARNING_BYTES)
    ) {
        issues.push({
            resource: 'disk',
            message: `Available disk space is ${formatResourcePercentage(disk.availableRatio)} (${formatResourceBytes(
                disk.availableBytes,
            )}) on ${disk.inspectedPath}.`,
        });
    }

    return {
        isWarningShown: issues.length > 0,
        issues,
        warningMessages: issues.map((issue) => issue.message),
    };
}
