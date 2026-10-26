import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { PtbkError } from '../common/errors.js';

/**
 * Version of the project encryption format (envelopes, derivation contexts and metadata).
 *
 * @private project encryption
 */
export const ENCRYPTION_FORMAT = 'ptbk-encryption/1';

/**
 * HKDF context of the project root key (versioned and Promptbook-specific).
 */
const ROOT_CONTEXT = 'promptbook/project-root/v1';

/**
 * Bytes of the public random project salt.
 */
const SALT_BYTES = 32;

/**
 * Bytes of a key (AES-256).
 */
const KEY_BYTES = 32;

/**
 * Bytes of an AES-GCM nonce (fresh for every envelope).
 */
const NONCE_BYTES = 12;

/**
 * Bits of entropy behind the 12 recovery words.
 */
const RECOVERY_STRENGTH = 128;

/**
 * Number of recovery words (128 bits of entropy plus checksum).
 */
const RECOVERY_WORDS = 12;

/**
 * Known plaintext of the verifier envelope: authenticates recovery words and host unlock without exposing anything.
 */
const VERIFIER_PLAINTEXT = 'promptbook project key verifier';

/**
 * One authenticated ciphertext: AES-256-GCM with a fresh nonce; the format and domain are authenticated data, so an
 * envelope never opens under another domain's key or format.
 *
 * @private project encryption
 */
export type Envelope = {
    readonly format: typeof ENCRYPTION_FORMAT;
    readonly algorithm: 'AES-256-GCM';
    /** Domain (key) the envelope belongs to, e.g. `wallet`. */
    readonly domain: string;
    readonly nonce: string;
    readonly tag: string;
    readonly data: string;
};

/**
 * Generates 12 recovery words from 128 bits of operating-system randomness with the standard English word list and
 * checksum (never chosen by a model).
 *
 * @private project encryption
 */
export function generateRecoveryWords(): string[] {
    return generateMnemonic(wordlist, RECOVERY_STRENGTH).split(' ');
}

/**
 * Normalizes typed recovery words (case, spacing, numbering) and validates count, word list and checksum.
 *
 * @private project encryption
 */
export function normalizeRecoveryWords(input: string | readonly string[]): string[] {
    const words = (typeof input === 'string' ? input : input.join(' '))
        .normalize('NFKD')
        .toLowerCase()
        .replace(/\b\d+[.)]/g, ' ')
        .split(/[\s,;]+/)
        .filter(Boolean);
    if (words.length !== RECOVERY_WORDS) throw new PtbkError(`Enter exactly 12 words for recovery (got ${words.length}).`, { kind: 'usage', effect: 'Nothing was changed.' });
    // Positions only: the words themselves are never echoed into messages or logs.
    const unknown = words.flatMap((word, index) => (wordlist.includes(word) ? [] : [index + 1]));
    if (unknown.length) throw new PtbkError(`${unknown.length === 1 ? `Word ${unknown[0]} is` : `Words ${unknown.join(', ')} are`} not on the recovery word list (check the spelling).`, { kind: 'usage', effect: 'Nothing was changed.' });
    if (!validateMnemonic(words.join(' '), wordlist)) throw new PtbkError('These 12 words are not a valid recovery set (a word is wrong or in the wrong place).', { kind: 'usage', effect: 'Nothing was changed.' });
    return words;
}

/**
 * A fresh public project salt.
 *
 * @private project encryption
 */
export function newProjectSalt(): Buffer {
    return randomBytes(SALT_BYTES);
}

/**
 * Derives the project root key: the standard mnemonic-to-seed derivation (UTF-8 NFKD, PBKDF2-HMAC-SHA512, 2048
 * iterations, 64 bytes, empty passphrase), then HKDF-SHA256 with the public project salt and the versioned root
 * context. The words or seed are never used as a key directly.
 *
 * @private project encryption
 */
export function deriveProjectRoot(words: readonly string[], salt: Buffer): Buffer {
    const seed = Buffer.from(mnemonicToSeedSync(words.join(' '), ''));
    try {
        return Buffer.from(hkdfSync('sha256', seed, salt, ROOT_CONTEXT, KEY_BYTES));
    } finally {
        seed.fill(0);
    }
}

/**
 * An independent key of one domain (`wallet`, `verifier`, …), derived from the root with its own versioned context.
 *
 * @private project encryption
 */
export function domainKey(root: Buffer, salt: Buffer, domain: string): Buffer {
    if (!/^[a-z][a-z-]*$/.test(domain)) throw new Error(`Invalid encryption domain "${domain}".`);
    return Buffer.from(hkdfSync('sha256', root, salt, `promptbook/domain/${domain}/v1`, KEY_BYTES));
}

/**
 * Authenticated data binding an envelope to the format and its domain.
 */
function associatedData(domain: string): Buffer {
    return Buffer.from(`${ENCRYPTION_FORMAT}|${domain}`, 'utf8');
}

/**
 * Encrypts plaintext under a domain key (fresh nonce).
 *
 * @private project encryption
 */
export function seal(key: Buffer, domain: string, plaintext: Buffer): Envelope {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(associatedData(domain));
    const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { format: ENCRYPTION_FORMAT, algorithm: 'AES-256-GCM', domain, nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

/**
 * Decrypts and authenticates an envelope of a domain. A wrong key, tampering, another domain or an unsupported format
 * fails without disclosing anything.
 *
 * @private project encryption
 */
export function open(key: Buffer, domain: string, envelope: Envelope): Buffer {
    if (envelope.format !== ENCRYPTION_FORMAT || envelope.algorithm !== 'AES-256-GCM') throw new PtbkError('The encrypted data uses an unsupported format.', { kind: 'configuration', reason: `${String(envelope.format)} / ${String(envelope.algorithm)}` });
    if (envelope.domain !== domain) throw new PtbkError('The encrypted data belongs to another domain.', { kind: 'conflict' });
    try {
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.nonce, 'base64'));
        decipher.setAAD(associatedData(domain));
        decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]);
    } catch {
        throw new PtbkError('The encrypted data could not be authenticated (a wrong key, or the data was changed).', { kind: 'conflict' });
    }
}

/**
 * The verifier envelope of a root key (stored with the metadata to check words and host unlock).
 *
 * @private project encryption
 */
export function createVerifier(root: Buffer, salt: Buffer): Envelope {
    return seal(domainKey(root, salt, 'verifier'), 'verifier', Buffer.from(VERIFIER_PLAINTEXT, 'utf8'));
}

/**
 * Whether a root key opens the stored verifier.
 *
 * @private project encryption
 */
export function verifyRoot(root: Buffer, salt: Buffer, verifier: Envelope): boolean {
    try {
        const plaintext = open(domainKey(root, salt, 'verifier'), 'verifier', verifier);
        const expected = Buffer.from(VERIFIER_PLAINTEXT, 'utf8');
        return plaintext.length === expected.length && timingSafeEqual(plaintext, expected);
    } catch {
        return false;
    }
}
