import { createHash, webcrypto } from 'node:crypto';
import { concatBytes, utf8 } from './encoding.js';

/**
 * Every purpose the engine key signs for (ADR 0014 of the platform). A changed input gets a new version and a new
 * purpose a new context; nothing else is ever signed with the engine key.
 *
 * @private App platform protocol
 */
export const SIGNING_CONTEXT = Object.freeze({
    tunnel: 'ptbk-tunnel-v1',
    hostname: 'ptbk-hostname-v1',
    register: 'ptbk-register-v1',
    heartbeat: 'ptbk-heartbeat-v1',
} as const);

/**
 * One engine-key signing context.
 *
 * @private App platform protocol
 */
export type SigningContext = (typeof SIGNING_CONTEXT)[keyof typeof SIGNING_CONTEXT];

/**
 * The known contexts, for the bug check of `signingInput`.
 */
const CONTEXTS: ReadonlySet<string> = new Set(Object.values(SIGNING_CONTEXT));

/**
 * Prefix of every signing input; it can never start a DSSE PAE (`DSSEv1 `), so engine-key and release signatures
 * cannot be confused.
 */
const PREFIX = utf8('ptbk-sig\0');

/**
 * `"ptbk-sig\0" ‖ u8 len(context) ‖ context ‖ (u32be len(part) ‖ part)…`. String parts are UTF-8; binary values
 * (nonces, digests, public keys) go in as raw bytes, never as their base64url text. Throws only on an unknown context,
 * which is a bug.
 *
 * @private App platform protocol
 */
export function signingInput(context: SigningContext, ...parts: ReadonlyArray<string | Uint8Array>): Uint8Array {
    if (!CONTEXTS.has(context)) throw new RangeError(`Unknown signing context: ${String(context)}`);
    const encoded: Uint8Array[] = [PREFIX, Uint8Array.of(context.length), utf8(context)];
    for (const part of parts) {
        const bytes = typeof part === 'string' ? utf8(part) : part;
        const length = new Uint8Array(4);
        new DataView(length.buffer).setUint32(0, bytes.length);
        encoded.push(length, bytes);
    }
    return concatBytes(...encoded);
}

/**
 * SHA-256 of bytes (raw 32-byte digest).
 *
 * @private App platform protocol
 */
export function sha256Bytes(bytes: Uint8Array): Uint8Array {
    return new Uint8Array(createHash('sha256').update(bytes).digest());
}

/**
 * Signs with the engine key, which stays non-extractable at runtime.
 *
 * @private App platform protocol
 */
export type EngineSigner = {
    /** The raw 32-byte Ed25519 public key. */
    readonly publicKey: Uint8Array;
    /** Ed25519 signature (64 bytes) over a signing input. */
    readonly sign: (input: Uint8Array) => Promise<Uint8Array>;
};

/**
 * Creates the engine signer from a PKCS#8 private key, imported as a non-extractable Web Crypto key.
 *
 * @private App platform protocol
 */
export async function createEngineSigner(pkcs8: Uint8Array, publicKey: Uint8Array): Promise<EngineSigner> {
    const key = await webcrypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, false, ['sign']);
    return {
        publicKey,
        sign: async (input) => new Uint8Array(await webcrypto.subtle.sign({ name: 'Ed25519' }, key, input)),
    };
}
