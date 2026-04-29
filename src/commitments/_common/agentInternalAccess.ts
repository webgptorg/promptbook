// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * HTTP header used by trusted local agent-to-agent calls.
 *
 * @private internal runtime wiring for Agents Server TEAM access
 */
export const AGENT_INTERNAL_ACCESS_HEADER = 'x-promptbook-agent-internal-access';

/**
 * Environment variable for explicitly configuring the local agent-to-agent access token.
 *
 * @private internal runtime wiring for Agents Server TEAM access
 */
export const AGENT_INTERNAL_ACCESS_TOKEN_ENV = 'PROMPTBOOK_AGENT_INTERNAL_ACCESS_TOKEN';

/**
 * Minimal environment shape used by the internal access helper.
 *
 * @private internal runtime wiring for Agents Server TEAM access
 */
type AgentInternalAccessEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Resolves process environment in runtimes where `process` is available.
 *
 * @returns Process environment or `null` in non-Node runtimes.
 *
 * @private internal runtime wiring for Agents Server TEAM access
 */
function resolveAgentInternalAccessEnvironment(): AgentInternalAccessEnvironment | null {
    if (typeof process === 'undefined' || !process.env) {
        return null;
    }

    return process.env;
}

/**
 * Resolves the shared token used for trusted local agent-to-agent calls.
 *
 * @returns Internal access token or `null` when no server secret is configured.
 *
 * @private internal runtime wiring for Agents Server TEAM access
 */
export function resolveAgentInternalAccessToken(): string | null {
    const environment = resolveAgentInternalAccessEnvironment();
    const token =
        environment?.[AGENT_INTERNAL_ACCESS_TOKEN_ENV] ||
        environment?.SUPABASE_SERVICE_ROLE_KEY ||
        environment?.ADMIN_PASSWORD;

    return token ? `promptbook-agent-internal:${token}` : null;
}

/**
 * Builds headers for trusted local agent-to-agent HTTP calls.
 *
 * @returns Header map containing the internal token, or an empty map.
 *
 * @private internal runtime wiring for Agents Server TEAM access
 */
export function createAgentInternalAccessHeaders(): Record<string, string> {
    const token = resolveAgentInternalAccessToken();
    if (!token) {
        return {};
    }

    return {
        [AGENT_INTERNAL_ACCESS_HEADER]: token,
    };
}

/**
 * Checks whether a received internal access token matches the configured server token.
 *
 * @param value - Header value received from an HTTP request.
 * @returns Whether the header authorizes a trusted local agent-to-agent call.
 *
 * @private internal runtime wiring for Agents Server TEAM access
 */
export function isAgentInternalAccessTokenValid(value: string | null | undefined): boolean {
    const token = resolveAgentInternalAccessToken();
    return Boolean(token && value === token);
}
