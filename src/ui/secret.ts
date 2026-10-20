import { PtbkError } from '../common/errors.js';
import type { TerminalProfile } from './terminal.js';

/**
 * Reads one secret line without echoing it (the terminal shows nothing while typing); Ctrl+C cancels. The value is
 * runtime-only: callers pass it straight to the shared `.env` editor.
 *
 * @private concealed input
 */
export async function readConcealed(terminal: TerminalProfile, label: string): Promise<string> {
    const stdin = process.stdin;
    terminal.write(`${label} (input is hidden): `);
    return await new Promise<string>((resolve, reject) => {
        let value = '';
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        const done = (result: string | Error): void => {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.off('data', onData);
            terminal.write('\n');
            if (result instanceof Error) reject(result);
            else resolve(result);
        };
        const onData = (chunk: string): void => {
            for (const character of chunk) {
                if (character === '\r' || character === '\n') return done(value);
                if (character === '\u0003') return done(new PtbkError('Cancelled; nothing was changed.', { kind: 'cancelled' }));
                if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
                else if (character >= ' ') value += character;
            }
        };
        stdin.on('data', onData);
    });
}
