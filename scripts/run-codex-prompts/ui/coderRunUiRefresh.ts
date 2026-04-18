import type { CoderRunPauseState } from './buildCoderRunUiFrame';
import type { CoderRunPhase } from './CoderRunUiState';

/**
 * Refresh cadence used only while the rich coder UI needs animated updates.
 *
 * @private internal constant of coder run UI
 */
export const ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS = 1000;

/**
 * Phases that still benefit from automatic refreshes because the frame can change
 * over time even without new runner output.
 *
 * @private internal constant of coder run UI
 */
const AUTO_REFRESH_PHASES: readonly CoderRunPhase[] = ['initializing', 'loading', 'running', 'verifying'];

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
    if (pauseState !== 'RUNNING') {
        return undefined;
    }

    return AUTO_REFRESH_PHASES.includes(phase) ? ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS : undefined;
}
