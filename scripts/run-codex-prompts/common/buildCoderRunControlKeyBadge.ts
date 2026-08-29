import colors from 'colors';
import type { CoderRunControlKey } from './CoderRunControlFeedback';

/**
 * Colors of the key badges, so one control key looks the same in its pill and in its answer.
 *
 * @private internal constant of `ptbk coder` terminal controls
 */
const CODER_RUN_CONTROL_KEY_BADGE_COLORIZERS: Record<CoderRunControlKey, (badgeText: string) => string> = {
    P: (badgeText) => colors.bgYellow.black(badgeText),
    S: (badgeText) => colors.bgCyan.black(badgeText),
    X: (badgeText) => colors.bgBlue.white(badgeText),
};

/**
 * Builds the colored badge of one control key, for example ` S `.
 *
 * @private internal utility of `ptbk coder` terminal controls
 */
export function buildCoderRunControlKeyBadge(controlKey: CoderRunControlKey): string {
    return CODER_RUN_CONTROL_KEY_BADGE_COLORIZERS[controlKey](` ${controlKey} `);
}
