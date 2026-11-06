import { createPrivateKey, createPublicKey, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { decodeBase64Url, encodeBase32Lower, encodeCrockfordBits, utf8 } from './encoding.js';
import { assertPrivate, createPrivateFile, ensurePrivateDirectory } from './files.js';
import { createEngineSigner, sha256Bytes, type EngineSigner } from './signing.js';

/**
 * File of the engine key inside the App data directory (PKCS#8 PEM, mode 0600).
 *
 * @private App connection
 */
export const ENGINE_KEY_FILE = 'engine-key.pem';

/**
 * Length of an engine ID: 130 bits of the key's SHA-256 in lowercase base32.
 */
const ENGINE_ID_LENGTH = 26;

/**
 * Domain prefix (and version) of the fingerprint derivation.
 */
const FINGERPRINT_DERIVATION = 'ptbk-fingerprint-v1';

/**
 * One hostname label: 1–63 of `[A-Za-z0-9-]`, no leading or trailing hyphen.
 */
const LABEL = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?';

/**
 * At least two labels, no trailing dot.
 */
const HOSTNAME_PATTERN = new RegExp(`^(?:${LABEL}\\.)+${LABEL}$`);

/**
 * A last label that browsers parse as an IPv4 number.
 */
const ENDS_IN_NUMBER = /\.(?:[0-9]+|0[xX][0-9A-Fa-f]*)$/;

/**
 * The format of an engine ID.
 */
const ENGINE_ID_PATTERN = /^[a-z2-7]{26}$/;

/**
 * Lowercased hostname when `text` is an ASCII hostname of the platform's rules (at most 253 characters, at least two
 * labels, no IP literal), otherwise `undefined`.
 *
 * @private App connection
 */
export function parseHostname(text: unknown): string | undefined {
    if (typeof text !== 'string' || text.length > 253 || !HOSTNAME_PATTERN.test(text) || ENDS_IN_NUMBER.test(text)) return undefined;
    return text.toLowerCase();
}

/**
 * Whether a value is a syntactically valid engine ID.
 *
 * @private App connection
 */
export function isEngineId(text: unknown): text is string {
    return typeof text === 'string' && ENGINE_ID_PATTERN.test(text);
}

/**
 * The engine ID of a raw 32-byte Ed25519 public key: SHA-256 over the raw bytes, lowercase base32, 26 characters.
 *
 * @private App connection
 */
export function deriveEngineId(publicKey: Uint8Array): string {
    if (publicKey.length !== 32) throw new RangeError('An Ed25519 public key has 32 bytes.');
    return encodeBase32Lower(sha256Bytes(publicKey)).slice(0, ENGINE_ID_LENGTH);
}

/**
 * The fingerprint people compare between the engine and the App dashboard (a recognition aid; the security property
 * is the engine ID in the hostname).
 *
 * @private App connection
 */
export type EngineFingerprint = {
    /** 20 Crockford base32 characters. */
    readonly code: string;
    /** `XXXX-XXXX-XXXX-XXXX-XXXX`. */
    readonly formatted: string;
    /** 5 rows of 5 cells, horizontally symmetric; `true` is filled. */
    readonly cells: ReadonlyArray<ReadonlyArray<boolean>>;
};

/**
 * Derives `ptbk-fingerprint-v1`: SHA-256 over the prefix immediately followed by the engine ID; the code is the first
 * 100 bits, the next 15 fill columns 0–2 of the 5×5 grid row by row, mirrored into columns 4 and 3.
 *
 * @private App connection
 */
export function deriveEngineFingerprint(engineId: string): EngineFingerprint {
    const bits = Array.from(sha256Bytes(utf8(`${FINGERPRINT_DERIVATION}${engineId}`)), (byte) => byte.toString(2).padStart(8, '0')).join('');
    const code = encodeCrockfordBits(bits.slice(0, 100));
    const pattern = bits.slice(100, 115);
    const cells = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, column) => pattern.charAt(row * 3 + Math.min(column, 4 - column)) === '1'));
    return { code, formatted: code.match(/.{4}/g)!.join('-'), cells };
}

/**
 * The engine's identity: its signer and what it derives.
 *
 * @private App connection
 */
export type EngineIdentity = {
    readonly signer: EngineSigner;
    readonly engineId: string;
    readonly fingerprint: EngineFingerprint;
};

/**
 * The raw 32-byte public key of an Ed25519 private key.
 */
function rawPublicKey(privateKey: KeyObject): Uint8Array {
    const x = createPublicKey(privateKey).export({ format: 'jwk' }).x;
    const bytes = typeof x === 'string' ? decodeBase64Url(x) : undefined;
    if (!bytes || bytes.length !== 32) throw new PtbkError('The engine key is not an Ed25519 key.', { kind: 'configuration' });
    return bytes;
}

/**
 * Builds the identity from a PEM private key.
 */
async function identityOf(pem: string, path: string): Promise<EngineIdentity> {
    let privateKey: KeyObject;
    try {
        privateKey = createPrivateKey(pem);
    } catch {
        throw new PtbkError(`The engine key in ${path} cannot be read. It is never replaced automatically; restore it, or remove it to become a new App engine that must be linked again.`, { kind: 'configuration' });
    }
    if (privateKey.asymmetricKeyType !== 'ed25519') throw new PtbkError(`The engine key in ${path} is not an Ed25519 key.`, { kind: 'configuration' });
    const publicKey = rawPublicKey(privateKey);
    const pkcs8 = new Uint8Array(privateKey.export({ format: 'der', type: 'pkcs8' }));
    const signer = await createEngineSigner(pkcs8, publicKey);
    pkcs8.fill(0);
    const engineId = deriveEngineId(publicKey);
    return { signer, engineId, fingerprint: deriveEngineFingerprint(engineId) };
}

/**
 * Loads the engine identity from the App data directory, creating it on first use when `create` is set. A concurrent
 * first use loads the key that won; an existing key is never overwritten or regenerated.
 *
 * @private App connection
 */
export async function loadEngineIdentity(directory: string, options: { readonly create: boolean }): Promise<EngineIdentity | undefined> {
    const path = join(directory, ENGINE_KEY_FILE);
    const read = async (): Promise<EngineIdentity> => {
        await assertPrivate(path, 'file');
        return await identityOf(await readFile(path, 'utf8'), path);
    };
    try {
        await lstat(path);
        await assertPrivate(directory, 'directory');
        return await read();
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (!options.create) return undefined;
    await ensurePrivateDirectory(directory);
    const { privateKey } = generateKeyPairSync('ed25519');
    const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    try {
        await createPrivateFile(directory, ENGINE_KEY_FILE, pem);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        return await read();
    }
    return await identityOf(pem, path);
}
