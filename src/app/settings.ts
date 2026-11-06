import { PtbkError } from '../common/errors.js';
import { parseHostname } from './identity.js';

/**
 * The App dashboard origin when `PTBK_DASHBOARD_URL` is not set.
 *
 * @private App connection
 */
export const DEFAULT_DASHBOARD_URL = 'https://app.ptbk.io';

/**
 * Most relays one engine keeps tunnels to (`MAX_RELAYS` of the platform).
 *
 * @private App connection
 */
export const MAX_RELAYS = 16;

/**
 * One relay the engine dials.
 *
 * @private App connection
 */
export type RelayEndpoint = {
    /** The relay's hostname (its relay ID, signed into the tunnel handshake). */
    readonly id: string;
    /** TCP port (443 unless an override names another). */
    readonly port: number;
};

/**
 * Configuration of the App connection, read from the environment of the engine or command.
 *
 * @private App connection
 */
export type AppSettings = {
    /** The dashboard API origin (`https://…`, no path). */
    readonly dashboardUrl: string;
    /** The engine domain when configured; otherwise it is pinned from the first verified registration. */
    readonly engineDomain?: string;
    /** Operator override of the registration's relays (development and tests). */
    readonly relays?: readonly RelayEndpoint[];
};

/**
 * Parses an `https://` origin (no credentials, path, query or fragment), naming the variable on failure.
 */
function parseOrigin(value: string, variable: string): string {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new PtbkError(`${variable} is not a URL.`, { kind: 'configuration' });
    }
    if (url.protocol !== 'https:' || url.username || url.password || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
        throw new PtbkError(`${variable} must be an https:// origin without credentials, path, query or fragment.`, { kind: 'configuration' });
    }
    return url.origin;
}

/**
 * Parses one `wss://<relay hostname>[:port]` override.
 */
function parseRelay(value: string): RelayEndpoint {
    let url: URL;
    try {
        url = new URL(value.trim());
    } catch {
        throw new PtbkError('PTBK_RELAYS must list wss:// relay URLs separated by commas.', { kind: 'configuration' });
    }
    const id = parseHostname(url.hostname);
    if (url.protocol !== 'wss:' || !id || url.username || url.password || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
        throw new PtbkError('PTBK_RELAYS must list wss://<relay hostname>[:port] URLs separated by commas.', { kind: 'configuration' });
    }
    return { id, port: url.port ? Number(url.port) : 443 };
}

/**
 * Reads the App connection settings from an environment. Refuses switched-off certificate verification, which would
 * let anyone in the path impersonate the dashboard or a relay.
 *
 * @private App connection
 */
export function appSettings(env: NodeJS.ProcessEnv = process.env): AppSettings {
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
        throw new PtbkError('NODE_TLS_REJECT_UNAUTHORIZED=0 switches off certificate verification, which the App connection refuses. Trust an inspecting proxy with NODE_EXTRA_CA_CERTS instead.', { kind: 'configuration' });
    }
    const dashboardUrl = env.PTBK_DASHBOARD_URL ? parseOrigin(env.PTBK_DASHBOARD_URL, 'PTBK_DASHBOARD_URL') : DEFAULT_DASHBOARD_URL;
    let engineDomain: string | undefined;
    if (env.PTBK_ENGINE_DOMAIN) {
        engineDomain = parseHostname(env.PTBK_ENGINE_DOMAIN);
        if (!engineDomain) throw new PtbkError('PTBK_ENGINE_DOMAIN must be a hostname such as engines.example.com.', { kind: 'configuration' });
    }
    let relays: RelayEndpoint[] | undefined;
    if (env.PTBK_RELAYS) {
        relays = env.PTBK_RELAYS.split(',').filter((item) => item.trim()).map(parseRelay);
        if (!relays.length || relays.length > MAX_RELAYS || new Set(relays.map((relay) => relay.id)).size !== relays.length) {
            throw new PtbkError(`PTBK_RELAYS must name 1 to ${String(MAX_RELAYS)} different relays.`, { kind: 'configuration' });
        }
    }
    return { dashboardUrl, ...(engineDomain ? { engineDomain } : {}), ...(relays ? { relays } : {}) };
}
