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
 * @param runtime - Runtime info, or `null` for a project which has no runtime at all.
 * @returns Human-readable status label.
 */
export function formatAgentProjectRuntimeStatus(runtime: AgentProjectRuntimeInfo | null): string {
    if (!runtime) {
        return 'Not running';
    }

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
