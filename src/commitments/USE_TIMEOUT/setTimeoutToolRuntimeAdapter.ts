import type { TimeoutToolRuntimeAdapter } from './TimeoutToolRuntimeAdapter';

/**
 * Process-wide runtime adapter reference used by `USE TIMEOUT` tools.
 *
 * @private internal singleton of USE TIMEOUT
 */
let timeoutToolRuntimeAdapter: TimeoutToolRuntimeAdapter | null = null;

/**
 * Sets runtime adapter used by `USE TIMEOUT` tools.
 *
 * @private internal utility of USE TIMEOUT
 */
export function setTimeoutToolRuntimeAdapter(adapter: TimeoutToolRuntimeAdapter | null): void {
    timeoutToolRuntimeAdapter = adapter;
}

/**
 * Gets runtime adapter used by `USE TIMEOUT` tools.
 *
 * @private internal utility of USE TIMEOUT
 */
export function getTimeoutToolRuntimeAdapter(): TimeoutToolRuntimeAdapter | null {
    return timeoutToolRuntimeAdapter;
}
