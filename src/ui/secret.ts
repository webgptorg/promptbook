import { PtbkError } from '../common/errors.js';
import { truncate } from './ansi.js';
import { handleProjectInput, KeyParser } from './keys.js';
import { InlineRenderer, projectFooterRows } from './screen.js';
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
        const parser = new KeyParser();
        const screen = projectFooterRows() ? new InlineRenderer() : undefined;
        /** Replaces one bounded line so revealed input cannot wrap into terminal scrollback. */
        const render = (): void => {
            const prompt = `${label} (${isRevealed ? 'visible; Ctrl+R hide' : 'hidden; Ctrl+R show'}): `;
            const text = truncate(prompt + (isRevealed ? value : '*'.repeat(Array.from(value).length)), terminal.columns() - 1);
            if (screen) screen.render([text], { row: 0, column: text.length });
            else terminal.write(`\r\u001b[2K${text}`);
        };
        /** Removes secret text and restores the terminal before resolving or rejecting. */
        const done = (error?: Error): void => {
            stdin.off('data', onData);
            screen?.clear();
            stdin.setRawMode(false);
            stdin.pause();
            terminal.write(`\r\u001b[2K${truncate(`${label} (hidden)`, terminal.columns() - 1)}\n`);
            if (error) reject(error);
            else resolve(value);
        };
        /** Handles editing and visibility without treating the shortcut as submission. */
        const onData = (chunk: Buffer | string): void => {
            for (const event of parser.parse(chunk.toString())) {
                if (handleProjectInput(event)) continue;
                if (event.type === 'key') {
                    if (event.ctrl && event.name === 'c') return done(new PtbkError('Cancelled; nothing was changed.', { kind: 'cancelled' }));
                    if (event.name === 'enter' || event.name === 'newline') return done();
                    if (event.ctrl && event.name === 'r') isRevealed = !isRevealed;
                    else if (event.name === 'backspace') value = Array.from(value).slice(0, -1).join('');
                    else if (event.name === 'space') value += ' ';
                } else if (event.type === 'text' || event.type === 'paste') value += event.text.replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
                render();
            }
        };
        stdin.setEncoding('utf8');
        stdin.setRawMode(true);
        stdin.on('data', onData);
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
    const screen = projectFooterRows() ? new InlineRenderer() : undefined;
    const prompt = `${label} (input is hidden): `;
    if (screen) screen.render([prompt], { row: 0, column: prompt.length });
    else terminal.write(prompt);
    return await new Promise<string>((resolve, reject) => {
        let value = '';
        const parser = new KeyParser();
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        const done = (result: string | Error): void => {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.off('data', onData);
            screen?.clear();
            terminal.write('\n');
            if (result instanceof Error) reject(result);
            else resolve(result);
        };
        const onData = (chunk: Buffer | string): void => {
            for (const event of parser.parse(chunk.toString())) {
                if (handleProjectInput(event)) continue;
                if (event.type === 'key') {
                    if (event.name === 'enter' || event.name === 'newline') return done(value);
                    if (event.ctrl && event.name === 'c') return done(new PtbkError('Cancelled; nothing was changed.', { kind: 'cancelled' }));
                    if (event.name === 'backspace') value = Array.from(value).slice(0, -1).join('');
                    else if (event.name === 'space') value += ' ';
                } else if (event.type === 'text' || event.type === 'paste') value += event.text.replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
            }
        };
        stdin.on('data', onData);
    });
}
