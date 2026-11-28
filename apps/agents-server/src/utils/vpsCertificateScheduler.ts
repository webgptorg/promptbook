import { applyVpsCertificateConfiguration } from './vpsConfiguration';

/**
 * Global key used to keep one automatic certificate scheduler per Node.js process.
 *
 * @private constant of `vpsCertificateScheduler`
 */
const VPS_CERTIFICATE_SCHEDULER_GLOBAL_KEY = '__PROMPTBOOK_VPS_CERTIFICATE_SCHEDULER__';

/**
 * How often the standalone VPS checks whether any assigned domain needs a
 * certificate obtained or renewed.
 *
 * Six hours is responsive enough to pick up a freshly pointed domain within a
 * few hours while staying far below the Let's Encrypt failed-validation rate
 * limit for domains whose DNS is still not ready.
 *
 * @private constant of `vpsCertificateScheduler`
 */
export const VPS_CERTIFICATE_MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Scheduler state stored on `globalThis` to survive module reloads.
 *
 * @private type of `vpsCertificateScheduler`
 */
type VpsCertificateSchedulerState = {
    /**
     * Whether the scheduler has been bootstrapped in this process.
     */
    isBootstrapped: boolean;
    /**
     * Whether one scheduled maintenance pass is currently running.
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
 * @private type of `vpsCertificateScheduler`
 */
type VpsCertificateSchedulerGlobal = typeof globalThis & {
    [VPS_CERTIFICATE_SCHEDULER_GLOBAL_KEY]?: VpsCertificateSchedulerState;
};

/**
 * Starts the automatic VPS certificate maintenance scheduler when the current runtime can run it.
 *
 * The maintenance pass itself is a no-op on hosts that are not a standalone
 * Linux VPS (the shared installer script cannot be resolved there), so this is
 * safe to call from every Node.js runtime startup.
 *
 * @private function of `vpsCertificateScheduler`
 */
export function ensureAutomaticVpsCertificateSchedulerBootstrapped(): void {
    if (!isVpsCertificateSchedulerRuntimeAvailable()) {
        return;
    }

    const state = getVpsCertificateSchedulerState();
    if (state.isBootstrapped) {
        return;
    }

    state.isBootstrapped = true;
    scheduleNextVpsCertificateMaintenance();
}

/**
 * Schedules the next certificate maintenance pass.
 *
 * @private function of `vpsCertificateScheduler`
 */
function scheduleNextVpsCertificateMaintenance(): void {
    const state = getVpsCertificateSchedulerState();
    clearVpsCertificateSchedulerTimer(state);

    state.timeout = setTimeout(() => {
        void runVpsCertificateMaintenance();
    }, VPS_CERTIFICATE_MAINTENANCE_INTERVAL_MS);
    state.timeout.unref?.();
}

/**
 * Runs one automatic certificate maintenance pass and reschedules the next one.
 *
 * Every failure only logs and never throws: a domain failing to obtain its
 * certificate must never take down the scheduler or the running server.
 *
 * @private function of `vpsCertificateScheduler`
 */
async function runVpsCertificateMaintenance(): Promise<void> {
    const state = getVpsCertificateSchedulerState();
    if (state.isRunning) {
        scheduleNextVpsCertificateMaintenance();
        return;
    }

    state.isRunning = true;

    try {
        await applyVpsCertificateConfiguration();
    } catch (error) {
        console.error('[vps-certificates] automatic certificate maintenance failed', error);
    } finally {
        state.isRunning = false;
        scheduleNextVpsCertificateMaintenance();
    }
}

/**
 * Clears one pending scheduler timer.
 *
 * @param state - Process-wide scheduler state.
 *
 * @private function of `vpsCertificateScheduler`
 */
function clearVpsCertificateSchedulerTimer(state: VpsCertificateSchedulerState): void {
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
 *
 * @private function of `vpsCertificateScheduler`
 */
function getVpsCertificateSchedulerState(): VpsCertificateSchedulerState {
    const schedulerGlobal = globalThis as VpsCertificateSchedulerGlobal;
    schedulerGlobal[VPS_CERTIFICATE_SCHEDULER_GLOBAL_KEY] ??= {
        isBootstrapped: false,
        isRunning: false,
        timeout: null,
    };

    return schedulerGlobal[VPS_CERTIFICATE_SCHEDULER_GLOBAL_KEY]!;
}

/**
 * Returns whether the current process should host the automatic certificate scheduler.
 *
 * Mirrors the standalone VPS self-update scheduler guard so both background
 * maintenance jobs only run in a real Linux Node.js server process, never during
 * tests or the Next.js production build.
 *
 * @returns `true` when running in a Linux Node.js server process outside tests and builds.
 *
 * @private function of `vpsCertificateScheduler`
 */
function isVpsCertificateSchedulerRuntimeAvailable(): boolean {
    if (process.platform !== 'linux') {
        return false;
    }

    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
        return false;
    }

    return process.env.NEXT_PHASE !== 'phase-production-build';
}
