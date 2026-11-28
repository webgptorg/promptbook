import { listAgentProjectRuntimes } from '../agentProjects/agentProjectRuntimeRegistry';
import type { AgentProjectRuntimesResourceUsage } from './resourceMonitorTypes';

/**
 * Reads project runtime port usage for the resource monitor.
 *
 * @returns Assigned project runtime ports and counters.
 */
export async function readAgentProjectRuntimesResourceUsage(): Promise<AgentProjectRuntimesResourceUsage> {
    try {
        const runtimes = await listAgentProjectRuntimes();

        return {
            runtimes,
            totalRuntimeCount: runtimes.length,
            runningRuntimeCount: runtimes.filter((runtime) => runtime.isRunning).length,
            errorMessage: null,
        };
    } catch (error) {
        return {
            runtimes: [],
            totalRuntimeCount: 0,
            runningRuntimeCount: 0,
            errorMessage: error instanceof Error ? error.message : 'Failed to read agent project runtimes.',
        };
    }
}

