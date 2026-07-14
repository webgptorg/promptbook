import { cache } from 'react';

import { readCpuResourceUsage } from './readCpuResourceUsage';
import { readDiskResourceUsage } from './readDiskResourceUsage';
import { readAgentProjectsResourceUsage } from './readAgentProjectsResourceUsage';
import { readMemoryResourceUsage } from './readMemoryResourceUsage';
import { readNetworkResourceUsage } from './readNetworkResourceUsage';
import { resolveServerResourceWarningStatus } from './resolveServerResourceWarningStatus';
import type { ServerResourceMonitorSnapshot, ServerResourceWarningStatus } from './resourceMonitorTypes';

/**
 * Reads a full resource monitor snapshot for the admin page.
 *
 * @returns Full resource monitor snapshot.
 */
export const readServerResourceMonitorSnapshot = cache(async (): Promise<ServerResourceMonitorSnapshot> => {
    const [cpu, disk, network, agentProjects] = await Promise.all([
        readCpuResourceUsage({ isProcessUsageSampled: true }),
        readDiskResourceUsage(),
        readNetworkResourceUsage(),
        readAgentProjectsResourceUsage(),
    ]);
    const memory = readMemoryResourceUsage();
    const warningStatus = resolveServerResourceWarningStatus({ cpu, memory, disk });

    return {
        measuredAt: new Date().toISOString(),
        cpu,
        memory,
        disk,
        network,
        agentProjects,
        warningStatus,
    };
});

/**
 * Reads the lightweight warning status used by the header menu.
 *
 * @returns Current resource warning status.
 */
export const readServerResourceWarningStatus = cache(async (): Promise<ServerResourceWarningStatus> => {
    const [cpu, disk] = await Promise.all([
        readCpuResourceUsage({ isProcessUsageSampled: false }),
        readDiskResourceUsage(),
    ]);
    const memory = readMemoryResourceUsage();

    return resolveServerResourceWarningStatus({ cpu, memory, disk });
});
