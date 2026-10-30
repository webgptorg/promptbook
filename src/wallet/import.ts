import { PtbkError } from '../common/errors.js';

/**
 * One importable login from an external password manager, with its secrets (kept only inside the Wallet's memory until
 * the owner's selection is applied; never written to an ordinary file, log, trace, chat or model context).
 *
 * @private Wallet import
 */
export type ImportedLogin = {
    /** Stable key within one import (source item and origin). */
    readonly key: string;
    /** Editable label from the source (empty when it has none). */
    readonly label: string;
    readonly origin: string;
    readonly username: string;
    readonly password: string;
    /**
     * Source fields that are not imported, named for an honest report (never their values): for example a TOTP
     * generator, since Wallet-owned TOTP generation/import is future scope.
     */
    readonly unsupported?: readonly string[];
};

/**
 * A source entry that cannot be imported, with the honest reason (never its secret values).
 *
 * @private Wallet import
 */
export type SkippedEntry = { readonly label: string; readonly reason: string };

/**
 * Everything a source adapter extracts from an export: importable logins and skipped entries.
 *
 * @private Wallet import
 */
export type ImportExtraction = { readonly source: string; readonly logins: readonly ImportedLogin[]; readonly skipped: readonly SkippedEntry[] };

/**
 * A source adapter: one export format. New sources add an adapter; validation, selection, encryption and persistence
 * stay in the one shared Wallet import.
 *
 * @private Wallet import
 */
export type ImportSource = { readonly id: string; readonly name: string; readonly extract: (content: string, normalizeOrigin: (input: string) => string) => ImportExtraction };

/**
 * Bitwarden item types (only logins are imported).
 */
const BITWARDEN_TYPES: Readonly<Record<number, string>> = { 1: 'login', 2: 'secure note', 3: 'card', 4: 'identity', 5: 'SSH key' };

/**
 * The Bitwarden adapter: a standard unencrypted JSON vault export (`bitwarden_export_*.json`). Encrypted, password
 * protected and account-restricted exports are explained before any Wallet change; they are never decrypted here.
 *
 * @private Wallet import
 */
export const BITWARDEN_SOURCE: ImportSource = {
    id: 'bitwarden',
    name: 'Bitwarden',
    extract(content, normalizeOrigin) {
        let data: { encrypted?: boolean; passwordProtected?: boolean; items?: unknown };
        try {
            data = JSON.parse(content) as typeof data;
        } catch {
            throw new PtbkError('This is not a Bitwarden JSON export.', { kind: 'usage', effect: 'Nothing was imported.', next: ['In Bitwarden choose Export vault → File format: .json (not encrypted), then import that file.'] });
        }
        if (data.encrypted === true || data.passwordProtected === true) {
            throw new PtbkError('This Bitwarden export is encrypted (password-protected or account-restricted); it cannot be read here.', {
                kind: 'unsupported',
                effect: 'Nothing was imported.',
                next: ['Export the vault again with File format ".json" (unencrypted), import it, then delete that file safely.'],
            });
        }
        if (!Array.isArray(data.items)) throw new PtbkError('This JSON file has no Bitwarden vault items.', { kind: 'usage', effect: 'Nothing was imported.', next: ['Choose the JSON file exported by Bitwarden (Export vault).'] });
        const logins: ImportedLogin[] = [];
        const skipped: SkippedEntry[] = [];
        data.items.forEach((raw, index) => {
            const item = (raw ?? {}) as { id?: string; type?: number; name?: string; login?: { username?: string | null; password?: string | null; totp?: string | null; uris?: Array<{ uri?: string | null }> | null } | null };
            const label = typeof item.name === 'string' ? item.name.trim() : '';
            const shown = label || `item ${index + 1}`;
            if (item.type !== 1) {
                skipped.push({ label: shown, reason: `a ${BITWARDEN_TYPES[item.type ?? 0] ?? 'non-login'} item (only website logins are imported)` });
                return;
            }
            const username = item.login?.username?.trim() ?? '';
            const password = item.login?.password ?? '';
            if (!username || !password) {
                skipped.push({ label: shown, reason: !username ? 'no username' : 'no password' });
                return;
            }
            const origins = new Set<string>();
            const invalid: string[] = [];
            for (const entry of item.login?.uris ?? []) {
                const uri = entry?.uri?.trim();
                if (!uri) continue;
                try {
                    const origin = normalizeOrigin(uri);
                    if (!/^https?:\/\//.test(origin)) throw new Error('not a website');
                    origins.add(origin);
                } catch {
                    invalid.push(uri.replace(/[?#].*$/, ''));
                }
            }
            if (!origins.size) {
                skipped.push({ label: shown, reason: invalid.length ? `no website address (${invalid.slice(0, 2).join(', ')} is not a website)` : 'no website address' });
                return;
            }
            // A TOTP generator is reported, not imported: its value never leaves this function.
            const unsupported = item.login?.totp?.trim() ? ['TOTP generator'] : [];
            // Every supported website of the item is its own login (no similarly named service is guessed).
            for (const origin of origins) logins.push({ key: `${item.id ?? index}|${origin}`, label, origin, username, password, ...(unsupported.length ? { unsupported } : {}) });
        });
        return { source: 'Bitwarden', logins, skipped };
    },
};

/**
 * The import sources, by id.
 *
 * @private Wallet import
 */
export const IMPORT_SOURCES: Readonly<Record<string, ImportSource>> = { [BITWARDEN_SOURCE.id]: BITWARDEN_SOURCE };
