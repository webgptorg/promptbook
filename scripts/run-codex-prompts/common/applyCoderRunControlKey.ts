import type { CoderRunControlFeedback } from './CoderRunControlFeedback';
import type {
    CoderRunEndAfterCurrentPromptToggleResult,
    CoderRunPauseToggleResult,
    CoderRunSkipCurrentWaitResult,
} from './waitForPause';
import {
    getPauseTargetLabel,
    requestSkipCurrentWait,
    toggleEndAfterCurrentPromptState,
    togglePauseState,
} from './waitForPause';

/**
 * Applies the terminal control bound to one pressed key and describes what that key press did.
 *
 * This is the single place where the `P`, `S` and `X` keys are turned into runner actions, so the
 * plain console listener and the rich terminal UI always perform the same action and always answer
 * the user, even when the pressed control changed nothing.
 *
 * @param keyName Name of the pressed key as reported by the `keypress` event.
 * @returns The answer shown to the user, or `undefined` when the key is not a control key.
 *
 * @private internal utility of `ptbk coder` terminal controls
 */
export function applyCoderRunControlKey(keyName: string | undefined): CoderRunControlFeedback | undefined {
    switch (keyName) {
        case 'p':
            return describePauseToggle(togglePauseState());
        case 's':
            return describeSkipCurrentWait(requestSkipCurrentWait());
        case 'x':
            return describeEndAfterCurrentPrompt(toggleEndAfterCurrentPromptState());
        default:
            return undefined;
    }
}

/**
 * Describes what pressing `P` did.
 *
 * @private helper of `applyCoderRunControlKey`
 */
function describePauseToggle(toggleResult: CoderRunPauseToggleResult): CoderRunControlFeedback {
    if (toggleResult === 'REQUESTED_PAUSE') {
        return {
            controlKey: 'P',
            message: `Pause requested, pausing before ${getPauseTargetLabel()}`,
            tone: 'warning',
        };
    }

    if (toggleResult === 'CANCELLED_PAUSE') {
        return {
            controlKey: 'P',
            message: 'Pause cancelled, the run continues',
            tone: 'success',
        };
    }

    return {
        controlKey: 'P',
        message: 'Resuming the run',
        tone: 'success',
    };
}

/**
 * Describes what pressing `S` did.
 *
 * @private helper of `applyCoderRunControlKey`
 */
function describeSkipCurrentWait(skipResult: CoderRunSkipCurrentWaitResult): CoderRunControlFeedback {
    if (skipResult === 'REQUESTED_SKIP') {
        return {
            controlKey: 'S',
            message: 'Skipping the current waiting, continuing right now',
            tone: 'success',
        };
    }

    return {
        controlKey: 'S',
        message: 'Nothing to skip, the coder is not waiting right now',
        tone: 'info',
    };
}

/**
 * Describes what pressing `X` did.
 *
 * @private helper of `applyCoderRunControlKey`
 */
function describeEndAfterCurrentPrompt(
    toggleResult: CoderRunEndAfterCurrentPromptToggleResult,
): CoderRunControlFeedback {
    if (toggleResult === 'REQUESTED_END') {
        return {
            controlKey: 'X',
            message: 'Ending after the current prompt finishes',
            tone: 'warning',
        };
    }

    return {
        controlKey: 'X',
        message: 'End cancelled, the whole queue will be processed',
        tone: 'success',
    };
}
