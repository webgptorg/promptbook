import { emitKeypressEvents, type Key } from 'node:readline';
import { CANCELLED, inputLine, type WizardFrame } from './prompts.js';
import { FullScreen } from './screen.js';
import { readConcealed, readOwnerCredential } from './secret.js';
import type { TerminalProfile } from './terminal.js';

/**
 * Width of one column of the 12 words for recovery.
 */
const RECOVERY_WORD_COLUMN = 18;

/**
 * The protected presentation of the 12 words for recovery (shared by the dashboard and init): guidance and the
 * numbered words in three columns. Only ever drawn inside a full-screen view, never into terminal scrollback.
 *
 * @private dashboard Wallet forms
 */
export function recoveryWordLines(words: readonly string[]): string[] {
    const columns = [0, 4, 8].map((start) => words.slice(start, start + 4).map((word, index) => `${String(start + index + 1).padStart(2)}. ${word}`.padEnd(RECOVERY_WORD_COLUMN)));
    return [
        'Write these 12 words for recovery on paper, in order, and keep them safe.',
        'With the project folder they restore its saved logins on another computer; they are shown only now.',
        '',
        ...[0, 1, 2, 3].map((row) => `   ${columns.map((column) => column[row] ?? '').join('')}`),
    ];
}

/**
 * Shows the 12 words for recovery on the terminal's alternate screen (never in the scrollback) and asks whether they
 * were written down: Y confirms, N or Esc discards them. The screen is restored either way.
 *
 * @private dashboard Wallet forms
 */
export async function confirmRecoveryWords(terminal: TerminalProfile, words: readonly string[]): Promise<boolean> {
    const screen = new FullScreen();
    const stdin = process.stdin;
    screen.enter();
    try {
        screen.draw(['', `  ${terminal.style.bold('Set up the Wallet')}`, '', ...recoveryWordLines(words).map((line) => `  ${line}`), '', `  ${terminal.style.muted('Y creates the Wallet (this computer then unlocks it automatically) · N discards these words.')}`]);
        return await new Promise<boolean>((resolve) => {
            const onKey = (_character: string | undefined, key: Key): void => {
                const name = key?.name;
                const answer = name === 'y' ? true : name === 'n' || name === 'escape' || (key?.ctrl && name === 'c') ? false : undefined;
                if (answer === undefined) return;
                stdin.off('keypress', onKey);
                stdin.setRawMode?.(false);
                stdin.pause();
                resolve(answer);
            };
            emitKeypressEvents(stdin);
            stdin.setRawMode?.(true);
            stdin.on('keypress', onKey);
            stdin.resume();
        });
    } finally {
        screen.leave();
    }
}

/**
 * A login entered for the Wallet (passed straight to the engine's shared Wallet operation; never persisted here).
 *
 * @private dashboard Wallet forms
 */
export type WalletLoginForm = { readonly origin: string; readonly username: string; readonly password: string; readonly label?: string };

/**
 * Asks for a website login: the website, the username (visible by default) and an optional label in the open, the
 * password masked with typing feedback; Ctrl+R shows or hides the current field.
 * `initial` prefills a pending request's website (or an updated record's); returns undefined when cancelled.
 *
 * @private dashboard Wallet forms
 */
export async function walletLoginForm(terminal: TerminalProfile, initial: { readonly origin?: string; readonly label?: string; readonly step?: string } = {}): Promise<WalletLoginForm | undefined> {
    const frame: WizardFrame = { title: 'ptbk dashboard', step: initial.step ?? 'Wallet · add a website login', summary: ['The username starts visible and the password masked. Ctrl+R shows or hides the field being entered; saved passwords cannot be revealed.'] };
    const origin = await inputLine(terminal, { frame, question: 'Website (for example https://example.com):', initial: initial.origin, validate: (value) => (value.trim() ? undefined : 'Enter the website.') });
    if (origin === CANCELLED) return undefined;
    const username = await readOwnerCredential(terminal, '  Username or email', { isVisible: true });
    if (!username.trim()) return undefined;
    const password = await readOwnerCredential(terminal, '  Password');
    if (!password) return undefined;
    const label = await inputLine(terminal, { frame, question: 'Label of this login (optional; "-" for the default: website · masked account):', initial: initial.label ?? '-' });
    if (label === CANCELLED) return undefined;
    return { origin: origin.trim(), username: username.trim(), password, ...(label.trim() && label.trim() !== '-' ? { label: label.trim() } : {}) };
}

/**
 * Asks for the 12 words for recovery (hidden while typed); returns undefined when nothing was entered.
 *
 * @private dashboard Wallet forms
 */
export async function walletRestoreForm(terminal: TerminalProfile): Promise<string | undefined> {
    terminal.write('\nRestore the Wallet on this computer: enter the 12 words for recovery in order, separated by spaces.\n');
    const words = await readConcealed(terminal, '  12 words for recovery');
    return words.trim() || undefined;
}
