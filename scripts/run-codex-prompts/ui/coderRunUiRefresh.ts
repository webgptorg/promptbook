import type { CoderRunPauseState } from '../common/waitForPause';
import { TERMINAL_AGENT_AVATAR_VISUAL_REFRESH_INTERVAL_MS } from '../../../src/utils/agents/terminalAgentAvatarVisual';
import type { CoderRunPhase } from './CoderRunUiState';

/**
 * Refresh cadence used only while the rich coder UI needs animated updates.
 *
 * @private internal constant of coder run UI
 */
export const ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS = TERMINAL_AGENT_AVATAR_VISUAL_REFRESH_INTERVAL_MS;

/**
 * Phases that still benefit from automatic refreshes because the frame can change
 * over time even without new runner output.
 *
 * @private internal constant of coder run UI
 */
const AUTO_REFRESH_PHASES: readonly CoderRunPhase[] = ['initializing', 'loading', 'running', 'verifying'];

/**
 * Phases where an animated `--agent` visual should keep rendering like it does on the web.
 *
 * @private internal constant of coder run UI
 */
const AGENT_VISUAL_AUTO_REFRESH_PHASES: readonly CoderRunPhase[] = [...AUTO_REFRESH_PHASES, 'waiting'];

/**
 * Returns whether the rich coder UI should keep animating on its own.
 *
 * @private internal utility of coder run UI
 */
export function isCoderRunUiAutoRefreshing(
    phase: CoderRunPhase,
    pauseState: CoderRunPauseState,
    isAgentVisualAnimated = false,
): boolean {
    // `PAUSING` still means the current task is winding down, so keep active
    // animations/timers running until the runner reaches the fully paused state.
    if (pauseState === 'PAUSED') {
        return false;
    }

    if (isAgentVisualAnimated) {
        return AGENT_VISUAL_AUTO_REFRESH_PHASES.includes(phase);
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
    isAgentVisualAnimated = false,
): number | undefined {
    return isCoderRunUiAutoRefreshing(phase, pauseState, isAgentVisualAnimated)
        ? ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS
        : undefined;
}
