import { resolve } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { parseHostname } from './identity.js';
import { TUNNEL_PATH } from './tunnel/handshake.js';

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
    /** A saved registration supplies the origin unless the operator explicitly sets one. */
    readonly dashboardUrlIsDefault?: true;
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
    // The tunnel path may be spelled out (`wss://relay:443/v1/tunnel`); the engine always dials it.
    if (url.protocol !== 'wss:' || !id || url.username || url.password || (url.pathname !== '/' && url.pathname !== '' && url.pathname !== TUNNEL_PATH) || url.search || url.hash) {
        throw new PtbkError('PTBK_RELAYS must list wss://<relay hostname>[:port] URLs separated by commas.', { kind: 'configuration' });
    }
    return { id, port: url.port ? Number(url.port) : 443 };
}

/**
 * The project's App data directory: `PTBK_DATA_DIR` when an operator or harness sets it (the platform's launch
 * contract), otherwise the ignored `.ptbk/app/` of the project.
 *
 * @private App connection
 */
export function appDirectory(projectAppDirectory: string, env: NodeJS.ProcessEnv = process.env): string {
    return env.PTBK_DATA_DIR ? resolve(env.PTBK_DATA_DIR) : projectAppDirectory;
}

/**
 * Whether the engine runs as an App tunnel engine (`PTBK_MODE=tunnel`): then an unsafe or invalid App connection is a
 * start refusal (non-zero exit naming the problem) instead of a problem shown on the App page.
 *
 * @private App connection
 */
export function isTunnelMode(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.PTBK_MODE === 'tunnel';
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
    return { dashboardUrl, ...(!env.PTBK_DASHBOARD_URL ? { dashboardUrlIsDefault: true } : {}), ...(engineDomain ? { engineDomain } : {}), ...(relays ? { relays } : {}) };
}
