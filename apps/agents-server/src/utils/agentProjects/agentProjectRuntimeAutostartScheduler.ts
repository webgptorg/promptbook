import { resolveAgentProjectRuntimeEnvironmentFlag } from './resolveAgentProjectRuntimeEnvironmentFlag';
import { startDefaultAgentProjectRuntimes } from './startDefaultAgentProjectRuntimes';

/**
 * Environment variable that can force-enable or force-disable starting projects automatically.
 */
export const PTBK_AGENT_PROJECT_RUNTIME_AUTOSTART_ENABLED_ENV = 'PTBK_AGENT_PROJECT_RUNTIME_AUTOSTART_ENABLED';

/**
 * Global key used to keep one automatic project-start scheduler per Node.js process.
 */
const AGENT_PROJECT_RUNTIME_AUTOSTART_SCHEDULER_GLOBAL_KEY = '__PROMPTBOOK_AGENT_PROJECT_RUNTIME_AUTOSTART__';

/**
 * How often the server checks whether every project is in the state it is expected to be in.
 *
 * Five minutes is short enough for a freshly created project and for a crashed one to come back
 * without anybody pressing a button, and long enough that a project which cannot start is retried
 * rarely instead of constantly.
 */
export const AGENT_PROJECT_RUNTIME_AUTOSTART_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Scheduler state stored on `globalThis` to survive module reloads.
 */
type AgentProjectRuntimeAutostartSchedulerState = {
    /**
     * Whether the scheduler has been bootstrapped in this process.
     */
    isBootstrapped: boolean;

    /**
     * Whether one pass is currently running.
     */
    isRunning: boolean;

    /**
     * Pending timer, if any.
     */
    timeout: NodeJS.Timeout | null;
};

/**
 * Global object shape used for process-wide scheduler state.
 */
type AgentProjectRuntimeAutostartSchedulerGlobal = typeof globalThis & {
    [AGENT_PROJECT_RUNTIME_AUTOSTART_SCHEDULER_GLOBAL_KEY]?: AgentProjectRuntimeAutostartSchedulerState;
};

/**
 * Starts all projects which are expected to be running and keeps them that way.
 *
 * The first pass runs immediately but never blocks the caller, so a restarted server serves its
 * first request while the projects behind it are coming up.
 */
export function ensureAgentProjectRuntimeAutostartBootstrapped(): void {
    if (!isAgentProjectRuntimeAutostartAvailable()) {
        return;
    }

    const state = getAgentProjectRuntimeAutostartSchedulerState();
    if (state.isBootstrapped) {
        return;
    }

    state.isBootstrapped = true;
    void runAgentProjectRuntimeAutostartPass();
}

/**
 * Schedules the next pass.
 */
function scheduleNextAgentProjectRuntimeAutostartPass(): void {
    const state = getAgentProjectRuntimeAutostartSchedulerState();
    clearAgentProjectRuntimeAutostartTimer(state);

    state.timeout = setTimeout(() => {
        void runAgentProjectRuntimeAutostartPass();
    }, AGENT_PROJECT_RUNTIME_AUTOSTART_INTERVAL_MS);
    state.timeout.unref?.();
}

/**
 * Runs one pass and reschedules the next one.
 *
 * Every failure only logs and never throws: a project which cannot be started must never take down
 * the scheduler or the running server.
 */
async function runAgentProjectRuntimeAutostartPass(): Promise<void> {
    const state = getAgentProjectRuntimeAutostartSchedulerState();
    if (state.isRunning) {
        scheduleNextAgentProjectRuntimeAutostartPass();
        return;
    }

    state.isRunning = true;

    try {
        const report = await startDefaultAgentProjectRuntimes();

        if (report.startedProjectCount > 0 || report.failedProjectCount > 0) {
            console.info(
                `🚀 Started ${report.startedProjectCount} agent project(s), ${report.runningProjectCount} already running, ${report.stoppedProjectCount} left stopped, ${report.failedProjectCount} failed.`,
            );
        }
    } catch (error) {
        console.error('[agent-project-runtimes] automatic project start failed', error);
    } finally {
        state.isRunning = false;
        scheduleNextAgentProjectRuntimeAutostartPass();
    }
}

/**
 * Clears one pending scheduler timer.
 *
 * @param state - Process-wide scheduler state.
 */
function clearAgentProjectRuntimeAutostartTimer(state: AgentProjectRuntimeAutostartSchedulerState): void {
    if (!state.timeout) {
        return;
    }

    clearTimeout(state.timeout);
    state.timeout = null;
}

/**
 * Returns process-wide scheduler state.
 *
 * @returns Mutable scheduler state.
 */
function getAgentProjectRuntimeAutostartSchedulerState(): AgentProjectRuntimeAutostartSchedulerState {
    const schedulerGlobal = globalThis as AgentProjectRuntimeAutostartSchedulerGlobal;
    schedulerGlobal[AGENT_PROJECT_RUNTIME_AUTOSTART_SCHEDULER_GLOBAL_KEY] ??= {
        isBootstrapped: false,
        isRunning: false,
        timeout: null,
    };

    return schedulerGlobal[AGENT_PROJECT_RUNTIME_AUTOSTART_SCHEDULER_GLOBAL_KEY]!;
}

/**
 * Returns whether the current process should start projects automatically.
 *
 * Projects are server-owned processes, so they are only started from a real Node.js server process,
 * never during tests or the Next.js production build.
 *
 * @returns `true` when this process may own project runtimes.
 */
function isAgentProjectRuntimeAutostartAvailable(): boolean {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
        return false;
    }

    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return false;
    }

    return resolveAgentProjectRuntimeEnvironmentFlag(PTBK_AGENT_PROJECT_RUNTIME_AUTOSTART_ENABLED_ENV) ?? true;
}
