import colors from 'colors';
import * as readline from 'readline';

/**
 * Pause lifecycle of `ptbk coder run`.
 */
export type CoderRunPauseState = 'RUNNING' | 'PAUSING' | 'PAUSED';

/**
 * Result of toggling the pause hotkey state.
 */
export type CoderRunPauseToggleResult = 'REQUESTED_PAUSE' | 'CANCELLED_PAUSE' | 'RESUMED';

/**
 * Current pause state.
 */
let pauseState: CoderRunPauseState = 'RUNNING';

/**
 * Stores one new pause state in the shared runner controller.
 */
function setPauseState(nextPauseState: CoderRunPauseState): void {
    pauseState = nextPauseState;
}

/**
 * Applies the same three-state toggle used by the `P` hotkey.
 */
export function togglePauseState(): CoderRunPauseToggleResult {
    if (pauseState === 'RUNNING') {
        setPauseState('PAUSING');
        return 'REQUESTED_PAUSE';
    }

    if (pauseState === 'PAUSING') {
        setPauseState('RUNNING');
        return 'CANCELLED_PAUSE';
    }

    setPauseState('RUNNING');
    return 'RESUMED';
}

/**
 * Listens for the "p" key to pause and resume.
 */
export function listenForPause(): void {
    if (!process.stdin.isTTY) {
        return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            process.exit();
        }

        if (key.name === 'p') {
            const toggleResult = togglePauseState();

            if (toggleResult === 'REQUESTED_PAUSE') {
                // Note: Using console.log here which adds a new line.
                // This is intentional to prevent the message from being overwritten.
                console.log(colors.bgWhite('Pausing...'));
            } else if (toggleResult === 'CANCELLED_PAUSE') {
                console.log(colors.green('Pause cancelled. Resuming...'));
            }
        }
    });
}

/**
 * If the execution is paused, it will wait until it is resumed.
 *
 * @param options.silent - When `true`, suppresses console output (used when the terminal UI handles display).
 * @param options.onPaused - Callback invoked when entering the PAUSED state.
 * @param options.onResumed - Callback invoked when leaving the PAUSED state.
 */
export async function checkPause(options?: {
    silent?: boolean;
    onPaused?: () => void;
    onResumed?: () => void;
}): Promise<void> {
    if (pauseState === 'PAUSING') {
        setPauseState('PAUSED');

        if (!options?.silent) {
            console.log(colors.bgWhite.black('Paused') + colors.gray(' (Press "p" to resume)'));
        }

        options?.onPaused?.();

        while (getPauseState() === 'PAUSED') {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        options?.onResumed?.();

        if (!options?.silent) {
            console.log(colors.green('Resuming...'));
        }
    }
}

/**
 * Returns the current pause state for external consumers such as the terminal UI.
 */
export function getPauseState(): CoderRunPauseState {
    return pauseState;
}

/**
 * Requests a pause from an external controller (e.g. the Ink UI).
 */
export function requestPause(): void {
    if (pauseState === 'RUNNING') {
        setPauseState('PAUSING');
    }
}

/**
 * Resumes execution from an external controller after a pause.
 */
export function requestResume(): void {
    setPauseState('RUNNING');
}
