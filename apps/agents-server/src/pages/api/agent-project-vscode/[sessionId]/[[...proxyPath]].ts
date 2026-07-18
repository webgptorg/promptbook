import type { IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders, Server } from 'http';
import { request as createHttpRequest } from 'http';
import { connect, type Socket } from 'net';
import type { Duplex } from 'stream';
import type { NextApiRequest, NextApiResponse } from 'next';
import { AGENT_PROJECT_RUNTIME_HOST } from '@/src/utils/agentProjects/agentProjectRuntimeConstants';
import {
    buildAgentProjectVscodeUpstreamOrigin,
    isAgentProjectVscodeProxyRequestAuthorized,
    parseAgentProjectVscodeProxyRequestTarget,
    type AgentProjectVscodeProxyRequestTarget,
    type AgentProjectVscodeProxySession,
} from '@/src/utils/agentProjects/agentProjectVscodeProxy';
import {
    getAgentProjectVscodeSession,
    refreshAgentProjectVscodeSession,
} from '@/src/utils/agentProjects/agentProjectVscodeServer';

/**
 * Next.js API config for streaming a raw proxy request body.
 */
export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};

/**
 * Next HTTP server with the browser VS Code upgrade proxy marker.
 */
type AgentProjectVscodeProxyServer = Server & {
    __promptbookAgentProjectVscodeUpgradeProxyBound?: boolean;
};

/**
 * Next API response with access to the underlying HTTP server.
 */
type NextApiResponseWithServerSocket = NextApiResponse & {
    readonly socket: Socket & {
        readonly server: AgentProjectVscodeProxyServer;
    };
};

/**
 * Proxies browser VS Code HTTP requests to the project code-server process.
 *
 * @param request - Next API request.
 * @param response - Next API response.
 */
export default async function agentProjectVscodeProxyHandler(
    request: NextApiRequest,
    response: NextApiResponse,
): Promise<void> {
    ensureAgentProjectVscodeUpgradeProxy((response as NextApiResponseWithServerSocket).socket.server);

    const proxyTarget = await resolveAuthorizedProxyRequest(request);
    if (!proxyTarget) {
        response.status(404).json({ error: 'Browser VS Code session was not found.' });
        return;
    }

    if (!proxyTarget.isAuthorized) {
        response.status(401).json({ error: 'Unauthorized browser VS Code session.' });
        return;
    }

    proxyHttpRequest({
        request,
        response,
        target: proxyTarget.target,
        session: proxyTarget.session,
    });
}

/**
 * Authorized proxy target resolved for one request.
 */
type AuthorizedProxyRequest = {
    /**
     * Parsed proxy path and upstream path.
     */
    readonly target: AgentProjectVscodeProxyRequestTarget;

    /**
     * Browser VS Code session.
     */
    readonly session: AgentProjectVscodeProxySession;

    /**
     * Whether the request carries the session token.
     */
    readonly isAuthorized: boolean;
};

/**
 * Resolves and authorizes one HTTP proxy request.
 *
 * @param request - Incoming request.
 * @returns Authorized proxy target or `null`.
 */
async function resolveAuthorizedProxyRequest(request: IncomingMessage): Promise<AuthorizedProxyRequest | null> {
    const target = parseAgentProjectVscodeProxyRequestTarget(request.url);
    if (!target) {
        return null;
    }

    const refreshedSession = await refreshAgentProjectVscodeSession(target.sessionId);
    const session = refreshedSession || getAgentProjectVscodeSession(target.sessionId);
    if (!session) {
        return null;
    }

    return {
        target,
        session,
        isAuthorized: isAgentProjectVscodeProxyRequestAuthorized(session, request.headers.cookie),
    };
}

/**
 * Proxies one standard HTTP request to code-server.
 *
 * @param options - Request, response, target, and session.
 */
function proxyHttpRequest(options: {
    readonly request: IncomingMessage;
    readonly response: NextApiResponse;
    readonly target: AgentProjectVscodeProxyRequestTarget;
    readonly session: AgentProjectVscodeProxySession;
}): void {
    const upstreamRequest = createHttpRequest(
        {
            hostname: AGENT_PROJECT_RUNTIME_HOST,
            port: options.session.port,
            method: options.request.method,
            path: options.target.upstreamPath,
            headers: createProxyRequestHeaders(options.request.headers, options.session, options.target),
        },
        (upstreamResponse) => {
            options.response.writeHead(
                upstreamResponse.statusCode || 502,
                rewriteProxyResponseHeaders({
                    headers: upstreamResponse.headers,
                    proxyBasePath: options.target.proxyBasePath,
                    upstreamOrigin: buildAgentProjectVscodeUpstreamOrigin(options.session),
                }),
            );
            upstreamResponse.pipe(options.response);
        },
    );

    upstreamRequest.on('error', () => {
        if (!options.response.headersSent) {
            options.response.status(502).json({ error: 'Browser VS Code proxy target is unavailable.' });
            return;
        }

        options.response.end();
    });

    options.request.pipe(upstreamRequest);
}

/**
 * Creates request headers for the upstream code-server request.
 *
 * @param headers - Incoming headers.
 * @param session - Browser VS Code session.
 * @param target - Parsed proxy target.
 * @returns Upstream headers.
 */
function createProxyRequestHeaders(
    headers: IncomingHttpHeaders,
    session: AgentProjectVscodeProxySession,
    target: AgentProjectVscodeProxyRequestTarget,
): IncomingHttpHeaders {
    const nextHeaders: IncomingHttpHeaders = {
        ...headers,
        host: `${AGENT_PROJECT_RUNTIME_HOST}:${session.port}`,
        'x-forwarded-host': headers.host,
        'x-forwarded-prefix': target.proxyBasePath,
        'x-forwarded-proto': headers['x-forwarded-proto'] || 'http',
    };

    delete nextHeaders.cookie;

    return nextHeaders;
}

/**
 * Rewrites response headers that need to stay inside the proxy base path.
 *
 * @param options - Headers and proxy origins.
 * @returns Rewritten headers.
 */
function rewriteProxyResponseHeaders(options: {
    readonly headers: IncomingHttpHeaders;
    readonly proxyBasePath: string;
    readonly upstreamOrigin: string;
}): OutgoingHttpHeaders {
    const nextHeaders: OutgoingHttpHeaders = { ...options.headers };
    const location = nextHeaders.location;

    if (typeof location === 'string') {
        nextHeaders.location = rewriteProxyLocationHeader({
            location,
            proxyBasePath: options.proxyBasePath,
            upstreamOrigin: options.upstreamOrigin,
        });
    }

    const setCookie = nextHeaders['set-cookie'];
    if (Array.isArray(setCookie)) {
        nextHeaders['set-cookie'] = setCookie.map((cookie) =>
            rewriteProxySetCookieHeader(cookie, options.proxyBasePath),
        );
    } else if (typeof setCookie === 'string') {
        nextHeaders['set-cookie'] = rewriteProxySetCookieHeader(setCookie, options.proxyBasePath);
    }

    return nextHeaders;
}

/**
 * Rewrites one upstream redirect into the proxy path.
 *
 * @param options - Location and proxy origins.
 * @returns Rewritten location.
 */
function rewriteProxyLocationHeader(options: {
    readonly location: string;
    readonly proxyBasePath: string;
    readonly upstreamOrigin: string;
}): string {
    if (options.location.startsWith(options.upstreamOrigin)) {
        const locationUrl = new URL(options.location);
        return `${options.proxyBasePath}${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`;
    }

    if (options.location.startsWith('/') && !options.location.startsWith(options.proxyBasePath)) {
        return `${options.proxyBasePath}${options.location}`;
    }

    return options.location;
}

/**
 * Rewrites a Set-Cookie path so code-server cookies stay inside the proxy path.
 *
 * @param cookie - Raw upstream Set-Cookie value.
 * @param proxyBasePath - Proxy base path.
 * @returns Rewritten Set-Cookie value.
 */
function rewriteProxySetCookieHeader(cookie: string, proxyBasePath: string): string {
    if (/;\s*path=/iu.test(cookie)) {
        return cookie.replace(/;\s*path=[^;]*/iu, `; Path=${proxyBasePath}`);
    }

    return `${cookie}; Path=${proxyBasePath}`;
}

/**
 * Ensures the shared HTTP server forwards browser VS Code WebSocket upgrades.
 *
 * @param server - Next HTTP server.
 */
function ensureAgentProjectVscodeUpgradeProxy(server: AgentProjectVscodeProxyServer): void {
    if (server.__promptbookAgentProjectVscodeUpgradeProxyBound) {
        return;
    }

    server.__promptbookAgentProjectVscodeUpgradeProxyBound = true;
    server.on('upgrade', (request, socket, head) => {
        void proxyAgentProjectVscodeWebSocket(request, socket, head);
    });
}

/**
 * Proxies one WebSocket upgrade request to code-server.
 *
 * @param request - Upgrade request.
 * @param socket - Browser socket.
 * @param head - Initial socket bytes.
 */
async function proxyAgentProjectVscodeWebSocket(request: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    if (!parseAgentProjectVscodeProxyRequestTarget(request.url)) {
        return;
    }

    const proxyTarget = await resolveAuthorizedProxyRequest(request);
    if (!proxyTarget) {
        rejectWebSocket(socket, '404 Not Found', 'Browser VS Code session was not found.');
        return;
    }

    if (!proxyTarget.isAuthorized) {
        rejectWebSocket(socket, '401 Unauthorized', 'Unauthorized browser VS Code session.');
        return;
    }

    const upstreamSocket = connect(proxyTarget.session.port, AGENT_PROJECT_RUNTIME_HOST, () => {
        upstreamSocket.write(createWebSocketUpgradeRequest(proxyTarget, request));
        if (head.length > 0) {
            upstreamSocket.write(head);
        }

        upstreamSocket.pipe(socket);
        socket.pipe(upstreamSocket);
    });

    upstreamSocket.on('error', () =>
        rejectWebSocket(socket, '502 Bad Gateway', 'Browser VS Code proxy target is unavailable.'),
    );
    socket.on('error', () => upstreamSocket.destroy());
}

/**
 * Creates the raw HTTP upgrade request sent to code-server.
 *
 * @param proxyTarget - Authorized proxy target.
 * @param request - Original upgrade request.
 * @returns Raw HTTP request head.
 */
function createWebSocketUpgradeRequest(proxyTarget: AuthorizedProxyRequest, request: IncomingMessage): string {
    const headers = createProxyRequestHeaders(request.headers, proxyTarget.session, proxyTarget.target);
    const lines = [`${request.method || 'GET'} ${proxyTarget.target.upstreamPath} HTTP/${request.httpVersion}`];

    for (const [headerName, headerValue] of Object.entries(headers)) {
        if (headerValue === undefined) {
            continue;
        }

        if (Array.isArray(headerValue)) {
            for (const singleHeaderValue of headerValue) {
                lines.push(`${headerName}: ${singleHeaderValue}`);
            }
            continue;
        }

        lines.push(`${headerName}: ${headerValue}`);
    }

    return `${lines.join('\r\n')}\r\n\r\n`;
}

/**
 * Writes a small HTTP error response to a WebSocket socket and closes it.
 *
 * @param socket - Browser socket.
 * @param status - HTTP status line suffix.
 * @param message - Error message.
 */
function rejectWebSocket(socket: Duplex, status: string, message: string): void {
    socket.write(`HTTP/1.1 ${status}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${message}`);
    socket.destroy();
}
