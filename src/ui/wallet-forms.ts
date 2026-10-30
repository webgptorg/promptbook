import { emitKeypressEvents, type Key } from 'node:readline';
import { CANCELLED, confirm, inputLine, selectMany, type WizardFrame } from './prompts.js';
import type { LoginField, WalletActionView, WalletImportPreview } from '../wallet/wallet.js';
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
 * were written down: Y confirms, N or Esc discards them. The screen is restored either way. `confirmation` describes
 * what Y does (initialization creates the Wallet only with the project).
 *
 * @private dashboard Wallet forms
 */
export async function confirmRecoveryWords(terminal: TerminalProfile, words: readonly string[], confirmation = 'Y creates the Wallet (this computer then unlocks it automatically)'): Promise<boolean> {
    const screen = new FullScreen();
    const stdin = process.stdin;
    screen.enter();
    try {
        screen.draw(['', `  ${terminal.style.bold('Set up the Wallet')}`, '', ...recoveryWordLines(words).map((line) => `  ${line}`), '', `  ${terminal.style.muted(`${confirmation} · N discards these words.`)}`]);
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
export type WalletLoginForm = { readonly origin: string; readonly username: string; readonly password: string; readonly label?: string; readonly fields?: readonly LoginField[] };

/**
 * Asks for a website login: the website, the username (visible by default) and an optional label in the open, the
 * password masked with typing feedback; Ctrl+R shows or hides the current field.
 * Optional additional login fields (date of birth, security answer, …) follow, their values masked too.
 * `initial` prefills a pending request's website (or an updated record's, whose saved fields stay unless changed);
 * returns undefined when cancelled.
 *
 * @private dashboard Wallet forms
 */
export async function walletLoginForm(terminal: TerminalProfile, initial: { readonly origin?: string; readonly label?: string; readonly step?: string; readonly fields?: readonly string[] } = {}): Promise<WalletLoginForm | undefined> {
    const frame: WizardFrame = { title: 'ptbk dashboard', step: initial.step ?? 'Wallet · add a website login', summary: ['The username starts visible and the password masked. Ctrl+R shows or hides the field being entered; saved passwords cannot be revealed.'] };
    const origin = await inputLine(terminal, { frame, question: 'Website (for example https://example.com):', initial: initial.origin, validate: (value) => (value.trim() ? undefined : 'Enter the website.') });
    if (origin === CANCELLED) return undefined;
    const username = await readOwnerCredential(terminal, '  Username or email', { isVisible: true });
    if (!username.trim()) return undefined;
    const password = await readOwnerCredential(terminal, '  Password');
    if (!password) return undefined;
    const label = await inputLine(terminal, { frame, question: 'Label of this login (optional; "-" for the default: website · masked account):', initial: initial.label ?? '-' });
    if (label === CANCELLED) return undefined;
    const fields = await additionalFieldsForm(terminal, frame, initial.fields ?? []);
    if (fields === undefined) return undefined;
    return { origin: origin.trim(), username: username.trim(), password, ...(label.trim() && label.trim() !== '-' ? { label: label.trim() } : {}), ...(fields.length ? { fields } : {}) };
}

/**
 * Asks for optional additional login fields: a name in the open, then its value masked. An empty name finishes; for an
 * already saved field, an empty value removes it. Returns undefined when cancelled.
 */
async function additionalFieldsForm(terminal: TerminalProfile, frame: WizardFrame, saved: readonly string[]): Promise<LoginField[] | undefined> {
    const fields: LoginField[] = [];
    for (;;) {
        const name = await inputLine(terminal, {
            frame: { ...frame, summary: [...(frame.summary ?? []), ...(saved.length ? [`Saved additional fields (kept unless you change them): ${saved.join(', ')}.`] : [])] },
            question: 'Additional login field the website asks for, for example "Date of birth" or "Security answer" (optional; empty to finish):',
        });
        if (name === CANCELLED) return undefined;
        if (!name.trim()) return fields;
        const value = await readOwnerCredential(terminal, `  ${name.trim()}${saved.some((label) => label.toLowerCase() === name.trim().toLowerCase()) ? ' (empty removes it)' : ''}`);
        fields.push({ label: name.trim(), value });
    }
}

/**
 * Asks for the additional login fields a website's form requested for a pending field request (each value masked),
 * and whether they stay the same for later logins (an uncertain value is kept too, marked). Returns undefined when
 * nothing was entered.
 *
 * @private dashboard Wallet forms
 */
export async function walletFieldForm(terminal: TerminalProfile, request: Pick<WalletActionView, 'origin' | 'fields'>): Promise<LoginField[] | undefined> {
    terminal.write(`\nThe login form of ${request.origin} asks for more than the username and password. The Wallet saves these values encrypted with the login and fills them for later sign-ins; agents never see them.\n`);
    const values: Array<{ readonly label: string; readonly value: string }> = [];
    for (const label of request.fields ?? []) {
        const value = await readOwnerCredential(terminal, `  ${label}`);
        if (value) values.push({ label, value });
    }
    if (!values.length) return undefined;
    const lasting = await confirm(terminal, {
        frame: { title: 'ptbk dashboard', step: 'Wallet · additional login fields' },
        question: 'Do these values stay the same for later logins?',
        defaultYes: true,
        yesLabel: 'Yes, they stay the same (saved)',
        noLabel: 'Not sure (saved, marked uncertain)',
    });
    if (lasting === CANCELLED) return undefined;
    return values.map((field) => ({ ...field, ...(lasting ? {} : { uncertain: true }) }));
}

/**
 * Asks for the one-time code a website sent for a pending code request or a running credential test (masked with typing
 * feedback, Ctrl+R shows it); returns undefined when nothing was entered. The code is used once and never stored.
 *
 * @private dashboard Wallet forms
 */
export async function walletCodeForm(terminal: TerminalProfile, origin: string, use = 'The Wallet enters it once for the waiting work; agents never see it and it is not saved.'): Promise<string | undefined> {
    terminal.write(`\nEnter the one-time code ${origin} sent you. ${use}\n`);
    const code = await readOwnerCredential(terminal, '  One-time code');
    return code.trim() || undefined;
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

/**
 * The engine's Wallet import operations as a surface calls them (the dashboard through its engine, init in process).
 *
 * @private dashboard Wallet forms
 */
export type WalletImportOperations = {
    readonly preview: (path: string) => Promise<WalletImportPreview>;
    readonly apply: (draft: string, select: readonly string[], replace: readonly string[]) => Promise<{ readonly outcome: string }>;
    readonly cancel: () => Promise<unknown>;
};

/**
 * The one terminal import flow of init and the Wallet page: the path of an unencrypted Bitwarden JSON export
 * (protected local input; its content never leaves the Wallet), a preview with individual, Select all and Select none
 * selection (identical duplicates are kept, conflicts are replaced only on an explicit choice), then one import.
 * Returns the outcome, or undefined when cancelled (nothing was saved).
 *
 * @private dashboard Wallet forms
 */
export async function walletImportFlow(terminal: TerminalProfile, operations: WalletImportOperations, frameTitle = 'ptbk dashboard'): Promise<string | undefined> {
    const frame: WizardFrame = {
        title: frameTitle,
        step: 'Wallet · import logins from Bitwarden',
        summary: ['In Bitwarden choose Export vault with the File format ".json" (not encrypted). The file contains your passwords: Promptbook reads it once, keeps no copy, and you delete it safely afterwards.'],
    };
    const path = await inputLine(terminal, { frame, question: 'Path of the exported JSON file:', validate: (value) => (value.trim() ? undefined : 'Enter the path of the export.') });
    if (path === CANCELLED) return undefined;
    let preview: WalletImportPreview;
    try {
        preview = await operations.preview(path.trim().replace(/^['"]|['"]$/g, ''));
    } catch (error) {
        return `Nothing was imported: ${(error as Error).message}`;
    }
    const skipped = preview.skipped.length ? [`Not imported (${preview.skipped.length}): ${preview.skipped.slice(0, 6).map((entry) => `${entry.label} — ${entry.reason}`).join('; ')}${preview.skipped.length > 6 ? '; …' : ''}`] : [];
    if (!preview.candidates.length) {
        await operations.cancel();
        return `The export has no website logins to import.${skipped.length ? ` ${skipped[0]}` : ''}`;
    }
    const describe = (candidate: WalletImportPreview['candidates'][number]): string =>
        `${candidate.origin} · ${candidate.account}${candidate.unsupported?.length ? ` · not imported: ${candidate.unsupported.join(', ')} (not supported yet)` : ''}${candidate.state === 'duplicate' ? ' · identical to a saved login (kept)' : candidate.state === 'conflict' ? ' · differs from the saved login' : ''}`;
    const selected = await selectMany(terminal, {
        frame: { ...frame, summary: [...(frame.summary ?? []), ...skipped] },
        question: 'Which logins should the Wallet import?',
        choices: preview.candidates.map((candidate) => ({ value: candidate.key, label: candidate.label, description: describe(candidate), disabled: candidate.state === 'duplicate' })),
        initial: preview.candidates.filter((candidate) => candidate.state === 'new').map((candidate) => candidate.key),
        noneLabel: 'None selected (nothing is imported)',
        bulk: true,
    });
    if (selected === CANCELLED || !selected.length) {
        await operations.cancel();
        return selected === CANCELLED ? undefined : 'Nothing was imported.';
    }
    const conflicts = preview.candidates.filter((candidate) => candidate.state === 'conflict' && selected.includes(candidate.key));
    let replace: string[] = [];
    if (conflicts.length) {
        const answer = await confirm(terminal, { frame, question: `Replace the saved values of ${conflicts.length} login${conflicts.length === 1 ? '' : 's'} that differ from the export (${conflicts.map((candidate) => candidate.label).join(', ')})?`, defaultYes: false, yesLabel: 'Yes, use the exported values', noLabel: 'No, keep the saved logins' });
        if (answer === CANCELLED) {
            await operations.cancel();
            return undefined;
        }
        if (answer) replace = conflicts.map((candidate) => candidate.key);
    }
    return (await operations.apply(preview.draft, selected, replace)).outcome;
}
