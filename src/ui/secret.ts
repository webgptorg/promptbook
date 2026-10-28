import { emitKeypressEvents, type Key } from 'node:readline';
import { PtbkError } from '../common/errors.js';
import { truncate } from './ansi.js';
import type { TerminalProfile } from './terminal.js';

/**
 * Reads newly entered Wallet credentials in the protected owner flow. Ctrl+R toggles visibility. A field starts
 * masked (neutral `*` typing feedback, never a blank unresponsive field) unless `isVisible` is set, as for the
 * username; its display is erased before leaving, including cancellation.
 *
 * @private dashboard Wallet credential entry
 */
export async function readOwnerCredential(terminal: TerminalProfile, label: string, options: { readonly isVisible?: boolean } = {}): Promise<string> {
    const stdin = process.stdin;
    return await new Promise<string>((resolve, reject) => {
        let value = '';
        let isRevealed = options.isVisible ?? false;
        /** Replaces one bounded line so revealed input cannot wrap into terminal scrollback. */
        const render = (): void => {
            const prompt = `${label} (${isRevealed ? 'visible; Ctrl+R hide' : 'hidden; Ctrl+R show'}): `;
            terminal.write(`\r\u001b[2K${truncate(prompt + (isRevealed ? value : '*'.repeat(Array.from(value).length)), terminal.columns() - 1)}`);
        };
        /** Removes secret text and restores the terminal before resolving or rejecting. */
        const done = (error?: Error): void => {
            stdin.off('keypress', onKey);
            stdin.setRawMode(false);
            stdin.pause();
            terminal.write(`\r\u001b[2K${truncate(`${label} (hidden)`, terminal.columns() - 1)}\n`);
            if (error) reject(error);
            else resolve(value);
        };
        /** Handles editing and visibility without treating the shortcut as submission. */
        const onKey = (character: string | undefined, key: Key): void => {
            if (key.ctrl && key.name === 'c') return done(new PtbkError('Cancelled; nothing was changed.', { kind: 'cancelled' }));
            if (key.name === 'return' || key.name === 'enter') return done();
            if (key.ctrl && key.name === 'r') isRevealed = !isRevealed;
            else if (key.name === 'backspace') value = Array.from(value).slice(0, -1).join('');
            else if (!key.ctrl && !key.meta && character && !/[\u0000-\u001f\u007f-\u009f]/.test(character)) value += character;
            render();
        };
        emitKeypressEvents(stdin);
        stdin.setEncoding('utf8');
        stdin.setRawMode(true);
        stdin.on('keypress', onKey);
        stdin.resume();
        render();
    });
}

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
