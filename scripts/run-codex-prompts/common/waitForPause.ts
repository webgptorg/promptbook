import colors from 'colors';
import * as readline from 'readline';

/**
 * Current pause state.
 */
let pauseState: 'RUNNING' | 'PAUSING' | 'PAUSED' = 'RUNNING';

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
            if (pauseState === 'RUNNING') {
                pauseState = 'PAUSING';
                // Note: Using console.log here which adds a new line.
                // This is intentional to prevent the message from being overwritten.
                console.log(colors.bgWhite('Pausing...'));
            } else if (pauseState === 'PAUSED') {
                pauseState = 'RUNNING';
                // The checkPause loop will terminate.
            } else if (pauseState === 'PAUSING') {
                // If user presses 'p' again while pausing, cancel the pause.
                pauseState = 'RUNNING';
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
        pauseState = 'PAUSED';

        if (!options?.silent) {
            console.log(colors.bgWhite.black('Paused') + colors.gray(' (Press "p" to resume)'));
        }

        options?.onPaused?.();

        while (pauseState === 'PAUSED') {
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
export function getPauseState(): 'RUNNING' | 'PAUSING' | 'PAUSED' {
    return pauseState;
}

/**
 * Requests a pause from an external controller (e.g. the Ink UI).
 */
export function requestPause(): void {
    if (pauseState === 'RUNNING') {
        pauseState = 'PAUSING';
    }
}

/**
 * Resumes execution from an external controller after a pause.
 */
export function requestResume(): void {
    pauseState = 'RUNNING';
}
