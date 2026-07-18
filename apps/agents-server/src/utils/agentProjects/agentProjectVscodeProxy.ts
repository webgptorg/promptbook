import { isTimingSafeEqualString } from '../../../../../src/utils/isTimingSafeEqualString';
import { readCookieHeaderValue } from '../readCookieHeaderValue';
import { AGENT_PROJECT_RUNTIME_HOST } from './agentProjectRuntimeConstants';

/**
 * Cookie carrying the per-session browser VS Code access token.
 */
export const AGENT_PROJECT_VSCODE_COOKIE_NAME = 'ptbkAgentProjectVscodeToken';

/**
 * Same-origin URL prefix used by the browser VS Code proxy.
 */
export const AGENT_PROJECT_VSCODE_PROXY_BASE_PATH_PREFIX = '/api/agent-project-vscode';

/**
 * Base URL used only for parsing relative proxy request URLs.
 */
const AGENT_PROJECT_VSCODE_PROXY_PARSE_BASE_URL = 'http://localhost';

/**
 * Parsed browser VS Code proxy target.
 */
export type AgentProjectVscodeProxyRequestTarget = {
    /**
     * Opaque session id from the proxy URL.
     */
    readonly sessionId: string;

    /**
     * Upstream request path sent to code-server.
     */
    readonly upstreamPath: string;

    /**
     * Same-origin base path of this proxy session.
     */
    readonly proxyBasePath: string;
};

/**
 * Browser-safe subset of one running browser VS Code session used by the proxy.
 */
export type AgentProjectVscodeProxySession = {
    /**
     * Opaque session id.
     */
    readonly id: string;

    /**
     * Random per-session access token stored in an HTTP-only cookie.
     */
    readonly accessToken: string;

    /**
     * Local code-server port.
     */
    readonly port: number;
};

/**
 * Builds the same-origin proxy base path for one browser VS Code session.
 *
 * @param sessionId - Opaque session id.
 * @returns Proxy base path.
 */
export function buildAgentProjectVscodeProxyBasePath(sessionId: string): string {
    return `${AGENT_PROJECT_VSCODE_PROXY_BASE_PATH_PREFIX}/${encodeURIComponent(sessionId)}`;
}

/**
 * Builds the local upstream origin for one browser VS Code proxy session.
 *
 * @param session - Running proxy session.
 * @returns Local code-server origin.
 */
export function buildAgentProjectVscodeUpstreamOrigin(session: AgentProjectVscodeProxySession): string {
    return `http://${AGENT_PROJECT_RUNTIME_HOST}:${session.port}`;
}

/**
 * Parses one incoming proxy URL into session id and upstream request path.
 *
 * @param requestUrl - Raw request URL from Node/Next.
 * @returns Parsed target or `null` when the URL is outside the proxy prefix.
 */
export function parseAgentProjectVscodeProxyRequestTarget(
    requestUrl: string | undefined,
): AgentProjectVscodeProxyRequestTarget | null {
    if (!requestUrl) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(requestUrl, AGENT_PROJECT_VSCODE_PROXY_PARSE_BASE_URL);
    } catch {
        return null;
    }

    const pathSegments = url.pathname.split('/').filter(Boolean);
    const expectedPrefixSegments = AGENT_PROJECT_VSCODE_PROXY_BASE_PATH_PREFIX.split('/').filter(Boolean);
    const isMatchingProxyPrefix = expectedPrefixSegments.every(
        (expectedSegment, index) => pathSegments[index] === expectedSegment,
    );

    if (!isMatchingProxyPrefix || pathSegments.length < expectedPrefixSegments.length + 1) {
        return null;
    }

    const encodedSessionId = pathSegments[expectedPrefixSegments.length];
    if (!encodedSessionId) {
        return null;
    }

    let sessionId: string;
    try {
        sessionId = decodeURIComponent(encodedSessionId);
    } catch {
        return null;
    }

    const proxyBasePath = buildAgentProjectVscodeProxyBasePath(sessionId);
    const upstreamPathname = url.pathname.slice(proxyBasePath.length) || '/';
    const upstreamPath = `${upstreamPathname.startsWith('/') ? upstreamPathname : `/${upstreamPathname}`}${url.search}`;

    return {
        sessionId,
        upstreamPath,
        proxyBasePath,
    };
}

/**
 * Reads the browser VS Code access token from a raw cookie header.
 *
 * @param cookieHeader - Raw `Cookie` header.
 * @returns Cookie token or `null`.
 */
export function readAgentProjectVscodeCookieToken(cookieHeader: string | string[] | undefined): string | null {
    return readCookieHeaderValue(cookieHeader, AGENT_PROJECT_VSCODE_COOKIE_NAME);
}

/**
 * Returns whether one raw cookie header authorizes access to a browser VS Code session.
 *
 * @param session - Browser VS Code session.
 * @param cookieHeader - Raw `Cookie` header.
 * @returns `true` when the request carries the session token.
 */
export function isAgentProjectVscodeProxyRequestAuthorized(
    session: AgentProjectVscodeProxySession,
    cookieHeader: string | string[] | undefined,
): boolean {
    return isTimingSafeEqualString(readAgentProjectVscodeCookieToken(cookieHeader), session.accessToken);
}
