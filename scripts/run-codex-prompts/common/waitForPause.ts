import colors from 'colors';
import * as readline from 'readline';

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
                console.log(colors.bgGray('Pausing...'));
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
 */
export async function checkPause(): Promise<void> {
    if (pauseState === 'PAUSING') {
        pauseState = 'PAUSED';
        console.log(colors.bgWhite.black('Paused') + colors.gray(' (Press "p" to resume)'));

        while (pauseState === 'PAUSED') {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log(colors.green('Resuming...'));
    }
}