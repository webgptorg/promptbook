import * as readline from 'readline';
import { applyCoderRunControlKey } from './applyCoderRunControlKey';
import { formatCoderRunControlFeedback } from './formatCoderRunControlFeedback';

/**
 * Listens for the terminal control keys while the plain console output is used.
 *
 * Every recognized key press is answered with one printed line, because the plain mode has no frame
 * which could show the new state on its own. The rich terminal UI installs its own listener in
 * [`renderCoderRunUi`](../ui/renderCoderRunUi.ts) and shares the very same key handling through
 * [`applyCoderRunControlKey`](./applyCoderRunControlKey.ts).
 *
 * @private internal utility of `ptbk coder` terminal controls
 */
export function listenForCoderRunControls(): void {
    if (!process.stdin.isTTY) {
        return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', (_pressedText, key) => {
        if (key.ctrl && key.name === 'c') {
            process.exit();
        }

        const controlFeedback = applyCoderRunControlKey(key.name);

        if (controlFeedback === undefined) {
            return;
        }

        // Note: Using console.log here which adds a new line.
        // This is intentional to prevent the message from being overwritten.
        console.log(formatCoderRunControlFeedback(controlFeedback));
    });
}

/**
 * Backwards-compatible alias for the shared terminal controls listener.
 *
 * @private internal utility of `ptbk coder` terminal controls
 */
export function listenForPause(): void {
    listenForCoderRunControls();
}
