import type { AgentProjectRuntimeInfo, AgentProjectRuntimeMode } from './AgentProjectRuntimeInfo';

/**
 * Formats one project runtime mode for UI display.
 *
 * @param mode - Runtime mode.
 * @returns Human-readable mode label.
 */
export function formatAgentProjectRuntimeMode(mode: AgentProjectRuntimeMode): string {
    if (mode === 'static-server') {
        return 'Static server';
    }

    if (mode === 'dev-server') {
        return 'Dev server';
    }

    return 'Assigned port';
}

/**
 * Formats one project runtime status for UI display.
 *
 * @param runtime - Runtime info.
 * @returns Human-readable status label.
 */
export function formatAgentProjectRuntimeStatus(runtime: AgentProjectRuntimeInfo): string {
    if (runtime.isRunning) {
        return 'Running';
    }

    if (runtime.status === 'assigned') {
        return 'Port assigned';
    }

    if (runtime.status === 'starting') {
        return 'Starting';
    }

    return 'Stopped';
}

