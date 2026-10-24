import { KeyboardSession, type KeyEvent } from './keys.js';
import { InlineRenderer } from './screen.js';
import type { TerminalProfile } from './terminal.js';

/**
 * Seconds of init's handoff countdown into the dashboard (brief, never a long delay).
 *
 * @private initialization experience
 */
export const HANDOFF_SECONDS = 5;

/**
 * A short visible, cancellable countdown before a handoff: Enter continues immediately, Escape/Ctrl+C skips, and the
 * expiry continues. Reduced motion keeps the same actions and timeout with a static line instead of a ticking number.
 * Resolves `open` (continue now or on expiry) or `skip`; it never touches the work that runs meanwhile.
 *
 * @private initialization experience
 */
export async function countdownHandoff(terminal: TerminalProfile, options: { readonly label: string; readonly seconds?: number }): Promise<'open' | 'skip'> {
    if (!terminal.interactive || !terminal.pretty || !process.stdin.isTTY) return 'skip';
    const { style } = terminal;
    const total = options.seconds ?? HANDOFF_SECONDS;
    const renderer = new InlineRenderer();
    const keys = style.muted('Enter open now · Esc skip');
    const line = (remaining: number): string =>
        terminal.reducedMotion ? `  ${style.accent(options.label)} in ${total} s  ${keys}` : `  ${style.accent(options.label)} in ${style.bold(String(remaining))} s  ${keys}`;
    return await new Promise((resolve) => {
        let remaining = total;
        let timer: NodeJS.Timeout | undefined;
        const finish = (outcome: 'open' | 'skip'): void => {
            if (timer) clearInterval(timer);
            keyboard.stop();
            renderer.finish([outcome === 'open' ? `  ${style.accent(options.label)}…` : `  ${style.muted('Skipped; the engine keeps running. Open it later with `ptbk dashboard`.')}`]);
            resolve(outcome);
        };
        const keyboard = new KeyboardSession((event: KeyEvent) => {
            if (event.type !== 'key') return;
            if (event.name === 'enter') finish('open');
            else if (event.name === 'escape' || (event.ctrl && event.name === 'c')) finish('skip');
        });
        keyboard.start();
        renderer.render([line(remaining)]);
        timer = setInterval(() => {
            remaining--;
            if (remaining <= 0) return finish('open');
            if (!terminal.reducedMotion) renderer.render([line(remaining)]);
        }, 1000);
    });
}
