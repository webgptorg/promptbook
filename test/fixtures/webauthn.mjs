// MIT; adapted from webgptorg/app packages/conformance/node/fakes/authenticator.ts
// Source commit: 9ac96b129d47e91b5db2a76689849f6a87751051 (see src/vendor/THIRD_PARTY_LICENSES.md).
import { encodeBase64Url } from '../../dist/app/encoding.js';

/**
 * A WebAuthn authenticator in software for the join checks: ES256, `none` attestation, user present and verified. It
 * builds the exact bytes a browser and a platform authenticator would, so the engine's real verification runs on them.
 */

                                                                                  

function cborHead(major        , length        )             {
    if (length < 24) return Uint8Array.of((major << 5) | length);
    if (length < 0x100) return Uint8Array.of((major << 5) | 24, length);
    if (length < 0x10000) return Uint8Array.of((major << 5) | 25, length >> 8, length & 0xff);
    throw new RangeError('the authenticator encodes nothing this long');
}

function concat(...parts                       )                          {
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

/** Just enough CBOR (RFC 8949) for an attestation object and a COSE key: small integers, strings, bytes and maps. */
function cbor(value           )             {
    if (typeof value === 'number') return value >= 0 ? cborHead(0, value) : cborHead(1, -1 - value);
    if (typeof value === 'string') {
        const bytes = new TextEncoder().encode(value);
        return concat(cborHead(3, bytes.length), bytes);
    }
    if (value instanceof Uint8Array) return concat(cborHead(2, value.length), value);
    const entries = [...value].flatMap(([key, item]) => [cbor(key), cbor(item)]);
    return concat(cborHead(5, value.size), ...entries);
}

const FLAGS_PRESENT_VERIFIED_ATTESTED = 0x01 | 0x04 | 0x40;

async function sha256(data                         )                      {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

                                          
                               
                                          
 

function isRegistrationOptions(value         )                                   {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value                                         ;
    return typeof candidate.challenge === 'string' && typeof candidate.rp === 'object' && candidate.rp !== null;
}

/** A new passkey for `options` at `origin`, as `startRegistration` would return it; throws on options it cannot use. */
export async function createPasskey(options         , origin        )                   {
    if (!isRegistrationOptions(options)) throw new Error('the engine sent no usable registration options');
    const rpId = options.rp.id ?? new URL(origin).hostname;
    const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
    const credentialId = crypto.getRandomValues(new Uint8Array(16));
    const cosePublicKey = cbor(
        new Map                      ([
            [1, 2],
            [3, -7],
            [-1, 1],
            [-2, raw.slice(1, 33)],
            [-3, raw.slice(33, 65)],
        ]),
    );
    const authData = concat(
        await sha256(new TextEncoder().encode(rpId)),
        Uint8Array.of(FLAGS_PRESENT_VERIFIED_ATTESTED),
        new Uint8Array(4),
        new Uint8Array(16),
        Uint8Array.of(0, credentialId.length),
        credentialId,
        cosePublicKey,
    );
    const attestationObject = cbor(
        new Map                      ([
            ['fmt', 'none'],
            ['attStmt', new Map()],
            ['authData', authData],
        ]),
    );
    const clientData = new TextEncoder().encode(
        JSON.stringify({ type: 'webauthn.create', challenge: options.challenge, origin, crossOrigin: false }),
    );
    const id = encodeBase64Url(credentialId);
    return {
        id,
        rawId: id,
        type: 'public-key',
        response: {
            clientDataJSON: encodeBase64Url(clientData),
            attestationObject: encodeBase64Url(attestationObject),
            transports: ['internal'],
        },
        authenticatorAttachment: 'platform',
        clientExtensionResults: {},
    };
}
