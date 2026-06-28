import CryptoJS from 'crypto-js';
import { isTimingSafeEqualString } from '../../utils/isTimingSafeEqualString';

/**
 * Header used for same-server TEAM calls that may access private teammate agents.
 *
 * @private internal Agents Server access wiring
 */
export const TEAM_INTERNAL_AGENT_ACCESS_HEADER = 'x-promptbook-team-agent-access-token';

/**
 * Options for creating same-server TEAM access headers.
 *
 * @private internal Agents Server access wiring
 */
export type TeamInternalAgentAccessHeadersOptions = {
    /**
     * URL of the teammate agent that is about to be contacted.
     */
    readonly agentUrl: string;
    /**
     * Origin of the current Agents Server.
     */
    readonly localServerUrl?: string;
    /**
     * Resolved internal access token carried by the runtime context.
     */
    readonly accessToken?: string | null;
};

/**
 * Resolves the internal token used by same-server TEAM calls.
 *
 * `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN` must be a dedicated secret — falling
 * back to `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, or any other shared
 * credential would let a leak of one secret compromise both authentication
 * boundaries (admin login and same-server teammate-agent access). When the
 * dedicated variable is missing, this function returns `null` so the calling
 * server fails closed — same-server TEAM access is disabled and no header is
 * sent — instead of silently authorizing requests with the wrong secret.
 *
 * @returns Hashed token, or `null` when the dedicated secret is not configured.
 *
 * @private internal Agents Server access wiring
 */
export function resolveTeamInternalAgentAccessToken(): string | null {
    const secret = normalizeSecret(readEnvironmentVariable('PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN'));

    if (!secret) {
        return null;
    }

    return CryptoJS.SHA256(`promptbook-team-agent-access:${secret}`).toString();
}

/**
 * Creates request headers for same-server TEAM calls.
 *
 * @param options - Target agent URL, local server URL, and resolved access token.
 * @returns Header map when the target is same-origin; otherwise an empty map.
 *
 * @private internal Agents Server access wiring
 */
export function createTeamInternalAgentAccessHeaders(
    options: TeamInternalAgentAccessHeadersOptions,
): Record<string, string> {
    if (!options.accessToken || !isSameOriginAgentUrl(options.agentUrl, options.localServerUrl)) {
        return {};
    }

    return {
        [TEAM_INTERNAL_AGENT_ACCESS_HEADER]: options.accessToken,
    };
}

/**
 * Checks whether an incoming header carries the current same-server TEAM access token.
 *
 * @param value - Raw request header value.
 * @returns `true` only when the server has a private token and the value matches it.
 *
 * @private internal Agents Server access wiring
 */
export function isTeamInternalAgentAccessToken(value: string | null | undefined): boolean {
    const expectedToken = resolveTeamInternalAgentAccessToken();
    const providedToken = normalizeSecret(value);

    return Boolean(expectedToken && providedToken && isTimingSafeEqualString(providedToken, expectedToken));
}

/**
 * Checks whether a teammate URL points back to the current Agents Server origin.
 *
 * @private internal Agents Server access wiring
 */
function isSameOriginAgentUrl(agentUrl: string, localServerUrl: string | undefined): boolean {
    if (!localServerUrl) {
        return false;
    }

    try {
        return new URL(agentUrl).origin === new URL(localServerUrl).origin;
    } catch {
        return false;
    }
}

/**
 * Reads one environment variable without assuming a Node runtime is always present.
 *
 * @private internal Agents Server access wiring
 */
function readEnvironmentVariable(name: string): string | undefined {
    if (typeof process === 'undefined' || !process.env) {
        return undefined;
    }

    return process.env[name];
}

/**
 * Normalizes optional secret values.
 *
 * @private internal Agents Server access wiring
 */
function normalizeSecret(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

// Note: [💞] Ignore a discrepancy between file name and entity name
