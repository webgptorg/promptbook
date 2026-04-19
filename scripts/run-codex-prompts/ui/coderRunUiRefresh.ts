import type { CoderRunPauseState } from './buildCoderRunUiFrame';
import type { CoderRunPhase } from './CoderRunUiState';

/**
 * Refresh cadence used only while the rich coder UI needs animated updates.
 *
 * @private internal constant of coder run UI
 */
export const ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS = 300;

/**
 * Phases that still benefit from automatic refreshes because the frame can change
 * over time even without new runner output.
 *
 * @private internal constant of coder run UI
 */
const AUTO_REFRESH_PHASES: readonly CoderRunPhase[] = ['initializing', 'loading', 'running', 'verifying'];

/**
 * Returns whether the rich coder UI should keep animating on its own.
 *
 * @private internal utility of coder run UI
 */
export function isCoderRunUiAutoRefreshing(phase: CoderRunPhase, pauseState: CoderRunPauseState): boolean {
    if (pauseState !== 'RUNNING') {
        return false;
    }

    return AUTO_REFRESH_PHASES.includes(phase);
}

/**
 * Returns the automatic refresh interval for the current UI state.
 *
 * Waiting, paused, and completed states return `undefined` so the rich UI stays
 * perfectly still until actual state changes arrive.
 *
 * @private internal utility of coder run UI
 */
export function getCoderRunUiAutoRefreshInterval(
    phase: CoderRunPhase,
    pauseState: CoderRunPauseState,
): number | undefined {
    return isCoderRunUiAutoRefreshing(phase, pauseState) ? ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS : undefined;
}
