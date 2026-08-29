import colors from 'colors';
import { buildCoderRunControlKeyBadge } from './buildCoderRunControlKeyBadge';
import type { CoderRunControlFeedback, CoderRunControlFeedbackTone } from './CoderRunControlFeedback';

/**
 * Marker printed before every control answer so it stands out from the runner output.
 *
 * @private internal constant of `ptbk coder` terminal controls
 */
const CODER_RUN_CONTROL_FEEDBACK_MARKER = '»';

/**
 * Colors of the control answers by their meaning.
 *
 * @private internal constant of `ptbk coder` terminal controls
 */
const CODER_RUN_CONTROL_FEEDBACK_COLORIZERS: Record<CoderRunControlFeedbackTone, (message: string) => string> = {
    success: (message) => colors.green(message),
    info: (message) => colors.cyan(message),
    warning: (message) => colors.yellow(message),
};

/**
 * Formats one control answer as a single colored terminal line.
 *
 * The same line is printed by the plain console listener and rendered inside the `Controls` box of the
 * rich terminal UI, so both modes answer a pressed control key identically.
 *
 * @param feedback Answer of the runner to the pressed control key.
 * @param repeatCount How many times this exact answer was given in a row, rendered from the second time on.
 *
 * @private internal utility of `ptbk coder` terminal controls
 */
export function formatCoderRunControlFeedback(feedback: CoderRunControlFeedback, repeatCount = 1): string {
    const colorizeMessage = CODER_RUN_CONTROL_FEEDBACK_COLORIZERS[feedback.tone];
    const repeatSuffix = repeatCount > 1 ? colors.gray(` (×${repeatCount})`) : '';

    return `${colors.gray(CODER_RUN_CONTROL_FEEDBACK_MARKER)} ${buildCoderRunControlKeyBadge(
        feedback.controlKey,
    )} ${colorizeMessage(feedback.message)}${repeatSuffix}`;
}
