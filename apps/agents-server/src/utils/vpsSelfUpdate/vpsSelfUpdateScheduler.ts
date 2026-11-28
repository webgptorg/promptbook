import { readVpsSelfUpdateAutomaticConfiguration } from './vpsSelfUpdateAutomaticConfiguration';
import { resolveNextVpsSelfUpdateCronRun } from './vpsSelfUpdateCron';
import { readVpsSelfUpdateOverview } from './readVpsSelfUpdateOverview';

/**
 * Global key used to keep one automatic self-update scheduler per Node.js process.
 *
 * @private constant of `vpsSelfUpdate`
 */
const VPS_SELF_UPDATE_SCHEDULER_GLOBAL_KEY = '__PROMPTBOOK_VPS_SELF_UPDATE_SCHEDULER__';

/**
 * Maximum safe delay accepted by Node.js timers.
 *
 * @private constant of `vpsSelfUpdate`
 */
const VPS_SELF_UPDATE_MAX_TIMER_DELAY_MS = 2_147_483_647;

/**
 * Scheduler state stored on `globalThis` to survive module reloads.
 *
 * @private type of `vpsSelfUpdateScheduler`
 */
type VpsSelfUpdateSchedulerState = {
    /**
     * Whether the scheduler has been bootstrapped in this process.
     */
    isBootstrapped: boolean;
    /**
     * Whether one scheduled check is currently running.
     */
    isRunning: boolean;
    /**
     * Pending timer, if any.
     */
    timeout: NodeJS.Timeout | null;
};

/**
 * Global object shape used for process-wide scheduler state.
 *
 * @private type of `vpsSelfUpdateScheduler`
 */
type VpsSelfUpdateSchedulerGlobal = typeof globalThis & {
    [VPS_SELF_UPDATE_SCHEDULER_GLOBAL_KEY]?: VpsSelfUpdateSchedulerState;
};

/**
 * Starts the automatic VPS self-update scheduler when the current runtime can run it.
 *
 * @private function of `vpsSelfUpdate`
 */
export function ensureAutomaticVpsSelfUpdateSchedulerBootstrapped(): void {
    if (!isAutomaticVpsSelfUpdateSchedulerRuntimeAvailable()) {
        return;
    }

    const state = getVpsSelfUpdateSchedulerState();
    if (state.isBootstrapped) {
        return;
    }

    state.isBootstrapped = true;
    void scheduleNextAutomaticVpsSelfUpdateCheck();
}

/**
 * Reschedules the automatic self-update timer after the admin changes `.env` configuration.
 *
 * @private function of `vpsSelfUpdate`
 */
export function rescheduleAutomaticVpsSelfUpdateScheduler(): void {
    if (!isAutomaticVpsSelfUpdateSchedulerRuntimeAvailable()) {
        return;
    }

    const state = getVpsSelfUpdateSchedulerState();
    state.isBootstrapped = true;
    clearAutomaticVpsSelfUpdateTimer(state);
    void scheduleNextAutomaticVpsSelfUpdateCheck();
}

/**
 * Schedules the next cron-based automatic self-update check.
 */
async function scheduleNextAutomaticVpsSelfUpdateCheck(): Promise<void> {
    const state = getVpsSelfUpdateSchedulerState();

    try {
        const configuration = await readVpsSelfUpdateAutomaticConfiguration();
        const nextRunAt = resolveNextVpsSelfUpdateCronRun(configuration.cronExpression);
        const delayMs = Math.max(1_000, nextRunAt.getTime() - Date.now());
        const timeoutDelayMs = Math.min(delayMs, VPS_SELF_UPDATE_MAX_TIMER_DELAY_MS);

        clearAutomaticVpsSelfUpdateTimer(state);
        state.timeout = setTimeout(() => {
            if (delayMs > VPS_SELF_UPDATE_MAX_TIMER_DELAY_MS) {
                void scheduleNextAutomaticVpsSelfUpdateCheck();
                return;
            }

            void runAutomaticVpsSelfUpdateCheck();
        }, timeoutDelayMs);
        state.timeout.unref?.();
    } catch (error) {
        console.error('[vps-self-update] failed to schedule automatic self-update check', error);
    }
}

/**
 * Runs one scheduled automatic self-update check.
 */
async function runAutomaticVpsSelfUpdateCheck(): Promise<void> {
    const state = getVpsSelfUpdateSchedulerState();
    if (state.isRunning) {
        await scheduleNextAutomaticVpsSelfUpdateCheck();
        return;
    }

    state.isRunning = true;

    try {
        const configuration = await readVpsSelfUpdateAutomaticConfiguration();
        if (!configuration.isEnabled) {
            return;
        }

        const overview = await readVpsSelfUpdateOverview();
        if (!overview.isAvailable || !overview.isUpdateAvailable || overview.job.status === 'running') {
            return;
        }

        const { startVpsSelfUpdate } = await import('./startVpsSelfUpdate');
        await startVpsSelfUpdate({
            environmentId: configuration.environment.id,
            trigger: 'automatic',
        });
    } catch (error) {
        console.error('[vps-self-update] automatic self-update check failed', error);
    } finally {
        state.isRunning = false;
        await scheduleNextAutomaticVpsSelfUpdateCheck();
    }
}

/**
 * Clears one pending scheduler timer.
 *
 * @param state - Process-wide scheduler state.
 */
function clearAutomaticVpsSelfUpdateTimer(state: VpsSelfUpdateSchedulerState): void {
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
function getVpsSelfUpdateSchedulerState(): VpsSelfUpdateSchedulerState {
    const schedulerGlobal = globalThis as VpsSelfUpdateSchedulerGlobal;
    schedulerGlobal[VPS_SELF_UPDATE_SCHEDULER_GLOBAL_KEY] ??= {
        isBootstrapped: false,
        isRunning: false,
        timeout: null,
    };

    return schedulerGlobal[VPS_SELF_UPDATE_SCHEDULER_GLOBAL_KEY]!;
}

/**
 * Returns whether the current process should host the automatic self-update scheduler.
 *
 * @returns `true` when running in a Linux Node.js server process outside tests and builds.
 */
function isAutomaticVpsSelfUpdateSchedulerRuntimeAvailable(): boolean {
    if (process.platform !== 'linux') {
        return false;
    }

    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
        return false;
    }

    return process.env.NEXT_PHASE !== 'phase-production-build';
}
