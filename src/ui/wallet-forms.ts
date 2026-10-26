import { CANCELLED, inputLine, type WizardFrame } from './prompts.js';
import { readConcealed } from './secret.js';
import type { TerminalProfile } from './terminal.js';

/**
 * A login entered for the Wallet (passed straight to the engine's shared Wallet operation; never stored or shown here).
 *
 * @private dashboard Wallet forms
 */
export type WalletLoginForm = { readonly origin: string; readonly username: string; readonly password: string; readonly label?: string };

/**
 * Asks for a website login: the website and an optional label in the open, the username and the password concealed.
 * `initial` prefills a pending request's website (or an updated record's); returns undefined when cancelled.
 *
 * @private dashboard Wallet forms
 */
export async function walletLoginForm(terminal: TerminalProfile, initial: { readonly origin?: string; readonly label?: string; readonly step?: string } = {}): Promise<WalletLoginForm | undefined> {
    const frame: WizardFrame = { title: 'ptbk dashboard', step: initial.step ?? 'Wallet · add a website login', summary: ['The password is hidden while you type, encrypted at once and never shown again.'] };
    const origin = await inputLine(terminal, { frame, question: 'Website (for example https://example.com):', initial: initial.origin, validate: (value) => (value.trim() ? undefined : 'Enter the website.') });
    if (origin === CANCELLED) return undefined;
    const username = await readConcealed(terminal, '  Username or email');
    if (!username.trim()) return undefined;
    const password = await readConcealed(terminal, '  Password');
    if (!password) return undefined;
    const label = await inputLine(terminal, { frame, question: 'Label shown instead of the username (optional; "-" for a masked username):', initial: initial.label ?? '-' });
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
