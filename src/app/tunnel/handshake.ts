import { decodeBase64Url, encodeBase64Url, isBase64UrlOfLength } from '../encoding.js';
import { parseHostname, type EngineIdentity } from '../identity.js';
import { SIGNING_CONTEXT, signingInput } from '../signing.js';

/**
 * The tunnel endpoint path on every relay.
 *
 * @private App tunnel
 */
export const TUNNEL_PATH = '/v1/tunnel';

/**
 * The WebSocket subprotocol; it names the protocol only, the version is negotiated.
 *
 * @private App tunnel
 */
export const TUNNEL_SUBPROTOCOL = 'ptbk-tunnel';

/**
 * Protocol versions this engine speaks.
 *
 * @private App tunnel
 */
export const TUNNEL_PROTOCOL_VERSIONS: readonly number[] = [1];

/**
 * Features this engine offers (v1 defines none).
 *
 * @private App tunnel
 */
export const TUNNEL_FEATURES: readonly string[] = [];

/**
 * Largest handshake text message, in UTF-8 bytes.
 *
 * @private App tunnel
 */
export const MAX_HANDSHAKE_MESSAGE_BYTES = 4096;

/**
 * WebSocket close codes of the tunnel.
 *
 * @private App tunnel
 */
export const TUNNEL_CLOSE_CODE = Object.freeze({ REPLACED: 4000, AUTH_FAILED: 4001, PROTOCOL_ERROR: 4002, SHUTTING_DOWN: 4003, SUSPENDED: 4004, FRAME_BUDGET: 4005 } as const);

/**
 * The relay's challenge.
 *
 * @private App tunnel
 */
export type TunnelChallenge = { readonly v: 1; readonly type: 'challenge'; readonly nonce: string; readonly relayId: string; readonly protocolVersions: readonly number[]; readonly features: readonly string[] };

/**
 * The relay's acceptance.
 *
 * @private App tunnel
 */
export type TunnelReady = { readonly v: 1; readonly type: 'ready'; readonly protocolVersion: number; readonly features: readonly string[]; readonly hostnames: readonly string[] };

/**
 * The relay's refusal.
 *
 * @private App tunnel
 */
export type TunnelReject = { readonly v: 1; readonly type: 'reject'; readonly reason: 'auth-failed' | 'suspended' | 'unsupported-version' | 'timeout' | 'rate-limited' };

/**
 * The engine's signed answer.
 *
 * @private App tunnel
 */
export type TunnelAuth = { readonly v: 1; readonly type: 'auth'; readonly engineId: string; readonly version: string; readonly protocolVersions: readonly number[]; readonly features: readonly string[]; readonly sig: string };

/**
 * Any message a relay sends.
 *
 * @private App tunnel
 */
export type RelayMessage = TunnelChallenge | TunnelReady | TunnelReject;

/**
 * The format of one feature flag.
 */
const FEATURE_PATTERN = /^[a-z0-9-]{1,32}$/;

/**
 * Reject reasons a relay may send.
 */
const REJECT_REASONS: ReadonlySet<string> = new Set(['auth-failed', 'suspended', 'unsupported-version', 'timeout', 'rate-limited']);

/**
 * Byte order of ASCII features (equal to UTF-16 order here; never locale order).
 */
function compareFeatures(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Whether an object has exactly the given keys (strict parsing refuses unknown fields).
 */
function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    const own = Object.keys(value);
    return own.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

/**
 * 1–8 unique protocol versions in 1..65535.
 */
function isVersionList(value: unknown): value is number[] {
    return Array.isArray(value) && value.length >= 1 && value.length <= 8 && value.every((item) => Number.isInteger(item) && item >= 1 && item <= 65_535) && new Set(value).size === value.length;
}

/**
 * 0–32 unique features.
 */
function isFeatureList(value: unknown): value is string[] {
    return Array.isArray(value) && value.length <= 32 && value.every((item) => typeof item === 'string' && FEATURE_PATTERN.test(item)) && new Set(value).size === value.length;
}

/**
 * Parses a text message from the relay strictly (size, JSON, exact fields). Never throws; `undefined` is a protocol
 * error.
 *
 * @private App tunnel
 */
export function parseRelayMessage(text: string): RelayMessage | undefined {
    if (text.length > MAX_HANDSHAKE_MESSAGE_BYTES || Buffer.byteLength(text, 'utf8') > MAX_HANDSHAKE_MESSAGE_BYTES) return undefined;
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        return undefined;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const message = value as Record<string, unknown>;
    if (message.v !== 1) return undefined;
    switch (message.type) {
        case 'challenge': {
            const relayId = parseHostname(message.relayId);
            if (!hasExactKeys(message, ['v', 'type', 'nonce', 'relayId', 'protocolVersions', 'features']) || !isBase64UrlOfLength(message.nonce, 32) || !relayId || !isVersionList(message.protocolVersions) || !isFeatureList(message.features)) return undefined;
            return { v: 1, type: 'challenge', nonce: message.nonce, relayId, protocolVersions: message.protocolVersions, features: message.features };
        }
        case 'ready': {
            if (!hasExactKeys(message, ['v', 'type', 'protocolVersion', 'features', 'hostnames'])) return undefined;
            const { protocolVersion, features, hostnames } = message;
            if (!Number.isInteger(protocolVersion) || (protocolVersion as number) < 1 || (protocolVersion as number) > 65_535 || !isFeatureList(features)) return undefined;
            if (!features.every((feature, index) => index === 0 || compareFeatures(features[index - 1]!, feature) < 0)) return undefined;
            if (!Array.isArray(hostnames) || hostnames.length < 1 || hostnames.length > 32) return undefined;
            const parsed = hostnames.map(parseHostname);
            if (parsed.some((name) => !name) || new Set(parsed).size !== parsed.length) return undefined;
            return { v: 1, type: 'ready', protocolVersion: protocolVersion as number, features, hostnames: parsed as string[] };
        }
        case 'reject':
            if (!hasExactKeys(message, ['v', 'type', 'reason']) || typeof message.reason !== 'string' || !REJECT_REASONS.has(message.reason)) return undefined;
            return { v: 1, type: 'reject', reason: message.reason as TunnelReject['reason'] };
        default:
            return undefined;
    }
}

/**
 * `[2, 10, 1]` → `"1,2,10"`.
 */
function encodeVersions(versions: readonly number[]): string {
    return [...versions].sort((a, b) => a - b).join(',');
}

/**
 * Byte-ordered, comma-joined features.
 */
function encodeFeatures(features: readonly string[]): string {
    return [...features].sort(compareFeatures).join(',');
}

/**
 * The signing input of `auth`: `ptbk-tunnel-v1` over the relay ID, the raw nonce, the engine ID and version, and the
 * relay's and the engine's lists in canonical order.
 *
 * @private App tunnel
 */
export function tunnelAuthInput(challenge: TunnelChallenge, engineId: string, offer: { readonly version: string; readonly versions: readonly number[]; readonly features: readonly string[] }): Uint8Array {
    const nonce = decodeBase64Url(challenge.nonce);
    if (!nonce) throw new TypeError('The challenge nonce is not base64url.');
    return signingInput(SIGNING_CONTEXT.tunnel, challenge.relayId, nonce, engineId, offer.version, encodeVersions(challenge.protocolVersions), encodeFeatures(challenge.features), encodeVersions(offer.versions), encodeFeatures(offer.features));
}

/**
 * Signs `auth` for a challenge, but only when it names the relay the engine dialled (taken from the engine's own
 * relay list); otherwise a relay could forward another relay's challenge.
 *
 * @private App tunnel
 */
export async function signTunnelAuth(identity: EngineIdentity, challenge: TunnelChallenge, version: string, dialledRelayId: string): Promise<{ kind: 'signed'; auth: TunnelAuth } | { kind: 'wrong-relay' }> {
    if (challenge.relayId !== dialledRelayId.toLowerCase()) return { kind: 'wrong-relay' };
    const offer = { version, versions: TUNNEL_PROTOCOL_VERSIONS, features: TUNNEL_FEATURES };
    const sig = encodeBase64Url(await identity.signer.sign(tunnelAuthInput(challenge, identity.engineId, offer)));
    return { kind: 'signed', auth: { v: 1, type: 'auth', engineId: identity.engineId, version, protocolVersions: [...offer.versions], features: [...offer.features], sig } };
}

/**
 * The highest common version and exactly the common features, byte-ordered (`undefined` without a common version).
 *
 * @private App tunnel
 */
export function negotiateTunnel(relay: { readonly versions: readonly number[]; readonly features: readonly string[] }, engine: { readonly versions: readonly number[]; readonly features: readonly string[] }): { protocolVersion: number; features: string[] } | undefined {
    const common = relay.versions.filter((version) => engine.versions.includes(version));
    if (!common.length) return undefined;
    return { protocolVersion: Math.max(...common), features: [...new Set(relay.features.filter((feature) => engine.features.includes(feature)))].sort(compareFeatures) };
}

/**
 * Whether `ready` chose exactly what the signed lists negotiate, so nobody in the path can downgrade the session.
 *
 * @private App tunnel
 */
export function checkTunnelReady(challenge: TunnelChallenge, auth: TunnelAuth, ready: TunnelReady): boolean {
    const expected = negotiateTunnel({ versions: challenge.protocolVersions, features: challenge.features }, { versions: auth.protocolVersions, features: auth.features });
    return !!expected && expected.protocolVersion === ready.protocolVersion && expected.features.length === ready.features.length && expected.features.every((feature, index) => feature === ready.features[index]);
}
