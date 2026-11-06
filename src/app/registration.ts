import { PtbkError } from '../common/errors.js';
import { ENGINE_VERSION } from '../common/version.js';
import { encodeBase64Url, isBase64UrlOfLength } from './encoding.js';
import { readPrivateFile, removePrivateFile, writePrivateFile } from './files.js';
import { deriveEngineId, isEngineId, parseHostname, type EngineIdentity } from './identity.js';
import { ConnectFailure, httpsRequest, type TestTlsOptions } from './net.js';
import { MAX_RELAYS, type AppSettings } from './settings.js';
import { SIGNING_CONTEXT, signingInput } from './signing.js';

/**
 * The registration endpoint on the dashboard API.
 *
 * @private App connection
 */
export const REGISTER_PATH = '/v1/engines/register';

/**
 * Largest registration request and answer the contract allows.
 */
const REGISTER_REQUEST_MAX_BYTES = 4096;
const REGISTER_RESPONSE_MAX_BYTES = 8192;

/**
 * File of the stored registration inside the App data directory.
 *
 * @private App connection
 */
export const REGISTRATION_FILE = 'registration.json';

/**
 * A link code: 128 random bits as lowercase base32, 26 characters.
 */
const LINK_CODE_PATTERN = /^[a-z2-7]{25}[aeimquy4]$/;

/**
 * Strict SemVer 2.0, as the platform's `EngineVersion`.
 */
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Whether a text has the shape of a link code (checked before anything is sent).
 *
 * @private App connection
 */
export function isLinkCode(text: string): boolean {
    return LINK_CODE_PATTERN.test(text);
}

/**
 * The engine's software version as the platform reads it (`EngineVersion`).
 *
 * @private App connection
 */
export function engineVersion(): string {
    if (!SEMVER_PATTERN.test(ENGINE_VERSION) || ENGINE_VERSION.length > 256) throw new PtbkError(`The engine version ${ENGINE_VERSION} is not SemVer.`, { kind: 'internal' });
    return ENGINE_VERSION;
}

/**
 * What the engine stores once a registration is verified.
 *
 * @private App connection
 */
export type StoredRegistration = {
    readonly v: 1;
    readonly engineId: string;
    /** The default hostname `<engineId>.<engineDomain>`. */
    readonly hostname: string;
    readonly relays: readonly string[];
    /** The dashboard member key (base64url), pinned for later member access; `null` from a dashboard without teams. */
    readonly memberKey: string | null;
    readonly dashboardUrl: string;
    readonly engineDomain: string;
    readonly registeredAt: string;
};

/**
 * Builds the signed `RegisterEngineRequest` body (`ptbk-register-v1` over `"1"`, the link code, the raw public key,
 * the engine version and the mode).
 *
 * @private App connection
 */
export async function signRegistration(identity: EngineIdentity, linkCode: string, version: string, mode: 'tunnel' | 'direct' = 'tunnel'): Promise<string> {
    const input = signingInput(SIGNING_CONTEXT.register, '1', linkCode, identity.signer.publicKey, version, mode);
    const sig = encodeBase64Url(await identity.signer.sign(input));
    return JSON.stringify({ v: 1, linkCode, enginePublicKey: encodeBase64Url(identity.signer.publicKey), engineVersion: version, mode, sig });
}

/**
 * What a registration attempt came to.
 *
 * @private App connection
 */
export type RegistrationOutcome =
    | { readonly kind: 'registered'; readonly registration: StoredRegistration }
    | {
          readonly kind: 'refused';
          /** The problem code, or `unavailable`/`invalid-response`/`identity-mismatch` for what the engine detected. */
          readonly code: string;
          readonly status?: number;
          /** No retry can help (only a new link code or the owner can). */
          readonly final: boolean;
          readonly message: string;
      };

/**
 * Owner-facing sentence and next step per registration problem code.
 *
 * @private App connection
 */
export const REGISTRATION_MESSAGES: Readonly<Record<string, { readonly final: boolean; readonly message: string }>> = {
    'invalid-link-code': { final: true, message: 'The link code is unknown, expired or already used. Get a new link code in the Promptbook App and run `ptbk connect --link <code>` again.' },
    'bad-signature': { final: true, message: 'The App could not verify this engine’s signature. This is a bug in the engine; please report it.' },
    'engine-exists': { final: true, message: 'This engine identity already belongs to another Promptbook App account. Link it from that account, or revoke it there first.' },
    'engine-suspended': { final: true, message: 'This engine was suspended or revoked in the Promptbook App. Restore it there, or link a new engine identity.' },
    'engine-limit': { final: true, message: 'The Promptbook App account has no room for another engine. Remove an engine or change the plan, then link again.' },
    'not-entitled': { final: true, message: 'The Promptbook App account’s plan does not include engines. Change the plan, then link again.' },
    'invalid-request': { final: true, message: 'The App refused the registration request as malformed. This is a bug in the engine; please report it.' },
    'too-large': { final: true, message: 'The App refused the registration request as too large. This is a bug in the engine; please report it.' },
    'rate-limited': { final: false, message: 'The Promptbook App is limiting link attempts from this address. Try again later with the same link code while it is valid.' },
};

/**
 * The tolerant reading of a problem+json answer: only a well-formed `code` is taken.
 */
function problemCode(body: Buffer): string | undefined {
    try {
        const parsed = JSON.parse(body.toString('utf8')) as { code?: unknown };
        return typeof parsed.code === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(parsed.code) && parsed.code.length <= 64 ? parsed.code : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Reads the known fields of a `RegisterEngineResponse` tolerantly (unknown fields are dropped), or `undefined` when a
 * known field is invalid.
 */
function readRegisterResponse(body: Buffer): { engineId: string; hostname: string; relays: string[]; memberKey: string | null } | undefined {
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(body.toString('utf8')) as Record<string, unknown>;
    } catch {
        return undefined;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const hostname = parseHostname(parsed.hostname);
    if (!isEngineId(parsed.engineId) || !hostname || !Array.isArray(parsed.relays)) return undefined;
    const relays = parsed.relays.map(parseHostname);
    if (relays.length < 1 || relays.length > MAX_RELAYS || relays.some((relay) => !relay) || new Set(relays).size !== relays.length) return undefined;
    const memberKey = parsed.memberKey === undefined || parsed.memberKey === null ? null : parsed.memberKey;
    if (memberKey !== null && !isBase64UrlOfLength(memberKey, 32)) return undefined;
    return { engineId: parsed.engineId, hostname, relays: relays as string[], memberKey };
}

/**
 * Checks an answer against the engine's own key and the engine domain. Without a configured engine domain the
 * hostname's first label must be the engine's own ID, and the rest becomes the pinned engine domain.
 *
 * @private App connection
 */
export function checkRegistrationIdentity(answer: { readonly engineId: string; readonly hostname: string }, publicKey: Uint8Array, engineDomain: string | undefined): { kind: 'ok'; engineDomain: string } | { kind: 'engine-id-mismatch' } | { kind: 'hostname-mismatch' } {
    const engineId = deriveEngineId(publicKey);
    if (answer.engineId !== engineId) return { kind: 'engine-id-mismatch' };
    if (engineDomain) return answer.hostname === `${engineId}.${engineDomain}` ? { kind: 'ok', engineDomain } : { kind: 'hostname-mismatch' };
    const prefix = `${engineId}.`;
    const pinned = answer.hostname.startsWith(prefix) ? parseHostname(answer.hostname.slice(prefix.length)) : undefined;
    return pinned ? { kind: 'ok', engineDomain: pinned } : { kind: 'hostname-mismatch' };
}

/**
 * Sleeps unless aborted.
 */
async function pause(ms: number, signal?: AbortSignal): Promise<void> {
    await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
        }, { once: true });
    });
}

/**
 * Registers the engine with a link code. Final refusals are never retried; `rate-limited`, 5xx, unknown codes and
 * network failures are retried after at least 5 s with exponential backoff, at most `attempts` times. Nothing is
 * stored here; the caller stores a `registered` outcome. The link code never leaves this function except in the one
 * request body.
 *
 * @private App connection
 */
export async function registerEngine(input: {
    readonly identity: EngineIdentity;
    readonly linkCode: string;
    readonly settings: AppSettings;
    readonly env: NodeJS.ProcessEnv;
    readonly attempts?: number;
    readonly retryDelayMs?: number;
    readonly signal?: AbortSignal;
    readonly tls?: TestTlsOptions;
    readonly onRetry?: (outcome: Extract<RegistrationOutcome, { kind: 'refused' }>, delayMs: number) => void;
}): Promise<RegistrationOutcome> {
    if (!isLinkCode(input.linkCode)) return { kind: 'refused', code: 'invalid-link-code', final: true, message: 'This is not a link code. Copy the whole code from the Promptbook App (26 lowercase letters and digits).' };
    const body = new TextEncoder().encode(await signRegistration(input.identity, input.linkCode, engineVersion()));
    if (body.length > REGISTER_REQUEST_MAX_BYTES) throw new PtbkError('The registration request exceeds its size limit.', { kind: 'internal' });
    const attempts = Math.max(1, input.attempts ?? 3);
    let delay = Math.max(5000, input.retryDelayMs ?? 5000);
    for (let attempt = 1; ; attempt++) {
        let outcome: RegistrationOutcome;
        try {
            const response = await httpsRequest({
                url: `${input.settings.dashboardUrl}${REGISTER_PATH}`,
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'application/json, application/problem+json' },
                body,
                maxResponseBytes: REGISTER_RESPONSE_MAX_BYTES,
                timeoutMs: 20_000,
                env: input.env,
                tls: input.tls,
            });
            outcome = await interpretRegistration(response.status, response.body, input.identity, input.settings);
        } catch (error) {
            outcome = { kind: 'refused', code: 'unavailable', final: false, message: `The Promptbook App at ${input.settings.dashboardUrl} could not be reached: ${error instanceof ConnectFailure ? error.message : 'the request failed.'}` };
        }
        if (outcome.kind === 'registered' || outcome.final || attempt >= attempts || input.signal?.aborted) return outcome;
        input.onRetry?.(outcome, delay);
        await pause(delay, input.signal);
        if (input.signal?.aborted) return outcome;
        delay *= 2;
    }
}

/**
 * Turns the dashboard's answer into an outcome.
 */
async function interpretRegistration(status: number, body: Buffer, identity: EngineIdentity, settings: AppSettings): Promise<RegistrationOutcome> {
    if (status === 200) {
        const answer = readRegisterResponse(body);
        if (!answer) return { kind: 'refused', code: 'invalid-response', status, final: true, message: 'The Promptbook App sent an invalid registration answer; nothing was stored.' };
        const check = checkRegistrationIdentity(answer, identity.signer.publicKey, settings.engineDomain);
        if (check.kind !== 'ok') {
            return { kind: 'refused', code: check.kind, status, final: true, message: `The Promptbook App answered with ${check.kind === 'engine-id-mismatch' ? 'an engine ID this engine’s key does not derive' : 'a hostname outside the engine domain'}; the registration was refused and nothing was stored.` };
        }
        return { kind: 'registered', registration: { v: 1, engineId: answer.engineId, hostname: answer.hostname, relays: answer.relays, memberKey: answer.memberKey, dashboardUrl: settings.dashboardUrl, engineDomain: check.engineDomain, registeredAt: new Date().toISOString() } };
    }
    const code = problemCode(body);
    const known = code ? REGISTRATION_MESSAGES[code] : undefined;
    if (known) return { kind: 'refused', code: code!, status, final: known.final, message: known.message };
    return { kind: 'refused', code: code ?? (status >= 500 ? 'unavailable' : `http-${String(status)}`), status, final: false, message: `The Promptbook App could not complete the registration (HTTP ${String(status)}${code ? `, ${code}` : ''}). Try again later.` };
}

/**
 * Reads and re-verifies the stored registration against the key and configuration; `undefined` when there is none.
 * A stored registration that no longer matches is an error, never silently replaced.
 *
 * @private App connection
 */
export async function readRegistration(directory: string, identity: EngineIdentity | undefined, settings: AppSettings): Promise<StoredRegistration | undefined> {
    const text = await readPrivateFile(directory, REGISTRATION_FILE);
    if (text === undefined) return undefined;
    let stored: StoredRegistration;
    try {
        stored = JSON.parse(text) as StoredRegistration;
    } catch {
        throw new PtbkError(`The stored App registration in ${directory} is unreadable. Run \`ptbk disconnect\` and link the project again.`, { kind: 'configuration' });
    }
    const relays = Array.isArray(stored.relays) ? stored.relays.map(parseHostname) : [];
    if (stored.v !== 1 || !isEngineId(stored.engineId) || !parseHostname(stored.hostname) || !relays.length || relays.some((relay) => !relay) || !parseHostname(stored.engineDomain) || typeof stored.dashboardUrl !== 'string') {
        throw new PtbkError(`The stored App registration in ${directory} is invalid. Run \`ptbk disconnect\` and link the project again.`, { kind: 'configuration' });
    }
    if (!identity) throw new PtbkError(`The App registration in ${directory} has no engine key next to it. Restore the key, or run \`ptbk disconnect\` and link the project as a new engine.`, { kind: 'configuration' });
    const check = checkRegistrationIdentity(stored, identity.signer.publicKey, stored.engineDomain);
    if (check.kind !== 'ok') throw new PtbkError(`The stored App registration does not belong to this engine key. Run \`ptbk disconnect\` and link the project again.`, { kind: 'configuration' });
    if (stored.dashboardUrl !== settings.dashboardUrl) throw new PtbkError(`This project is linked through ${stored.dashboardUrl}, but PTBK_DASHBOARD_URL is now ${settings.dashboardUrl}. Restore the setting, or run \`ptbk disconnect\` and link again.`, { kind: 'configuration' });
    if (settings.engineDomain && stored.engineDomain !== settings.engineDomain) throw new PtbkError(`This project is linked in the engine domain ${stored.engineDomain}, but PTBK_ENGINE_DOMAIN is now ${settings.engineDomain}. Restore the setting, or run \`ptbk disconnect\` and link again.`, { kind: 'configuration' });
    return stored;
}

/**
 * Stores a verified registration durably (0600).
 *
 * @private App connection
 */
export async function storeRegistration(directory: string, registration: StoredRegistration): Promise<void> {
    await writePrivateFile(directory, REGISTRATION_FILE, `${JSON.stringify(registration, null, 4)}\n`);
}

/**
 * Forgets the registration (the identity stays).
 *
 * @private App connection
 */
export async function forgetRegistration(directory: string): Promise<void> {
    await removePrivateFile(directory, REGISTRATION_FILE);
}
