import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { UsageGrouping } from '../engine/usage.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { engineModule } from '../common/version.js';
import type { Agenda } from '../engine/agenda.js';
import { secretToken } from '../common/ids.js';
import { applyChatAction, applySettings, applyToolAction, applyWalletAction, CONTROL_ACTIONS, WALLET_ACTIONS, type ControlOutcome } from './actions.js';
import { assertLocalRequest, authenticateLocalRequest } from './auth.js';
import { TASK_SORT_FIELDS, sortTasks, type TaskSortField } from '../tasks/views.js';

/**
 * First port tried when none is configured.
 *
 * @private local HTTP server
 */
export const DEFAULT_PORT = 3000;

/**
 * Number of consecutive ports tried automatically.
 */
const PORT_SEARCH_RANGE = 100;

/**
 * Upper bound of one long-poll request.
 */
const LONG_POLL_MS = 25_000;

/**
 * Maximal JSON request body.
 */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * Static assets of the browser dashboard (served from the installation).
 */
const STATIC_FILES: Readonly<Record<string, string>> = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/assets/app.js': 'app.js',
    '/assets/app.css': 'app.css',
    '/assets/icon.svg': 'icon.svg',
};

/**
 * Content types of static assets.
 */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
    html: 'text/html; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',
    svg: 'image/svg+xml',
};

/**
 * Security headers on every response.
 */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Inputs of the HTTP server.
 *
 * @private local HTTP server
 */
export type HttpServerOptions = {
    readonly agenda: Agenda;
    /** The engine's shared control operations (lifecycle, waits, browser recovery). */
    readonly control: (action: string, params: Readonly<Record<string, unknown>>) => Promise<ControlOutcome>;
    /** Owner-readable local control credential; never returned by HTTP. */
    readonly token: string;
    /** Requested port (exact) or undefined for automatic search from 3000. */
    readonly port?: number;
};

/**
 * A running HTTP server.
 *
 * @private local HTTP server
 */
export type RunningHttpServer = { readonly port: number; readonly url: string; readonly close: () => Promise<void> };

/**
 * Listens on loopback; with an explicit port a conflict is an error, otherwise the next free port is used.
 */
async function listen(server: Server, port: number | undefined): Promise<number> {
    const candidates = port !== undefined ? [port] : Array.from({ length: PORT_SEARCH_RANGE }, (_, index) => DEFAULT_PORT + index);
    let lastError: unknown;
    for (const candidate of candidates) {
        try {
            await new Promise<void>((resolve, reject) => {
                const onError = (error: Error): void => {
                    server.off('listening', onListening);
                    reject(error);
                };
                const onListening = (): void => {
                    server.off('error', onError);
                    resolve();
                };
                server.once('error', onError);
                server.once('listening', onListening);
                server.listen(candidate, '127.0.0.1');
            });
            return candidate;
        } catch (error) {
            lastError = error;
            if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') break;
        }
    }
    if (port !== undefined) {
        throw new PtbkError(`Port ${port} is not available.`, { kind: 'conflict', reason: errorMessage(lastError), next: ['Choose another `--port`, or omit it for automatic selection.'] });
    }
    throw new PtbkError('No free local port was found for the dashboard.', { kind: 'technical', reason: errorMessage(lastError), next: ['Pass `--port <port>` or `--no-server`.'] });
}

/**
 * Reads a JSON request body (bounded).
 */
async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        size += (chunk as Buffer).length;
        if (size > MAX_BODY_BYTES) throw new PtbkError('Request body too large.', { kind: 'usage' });
        chunks.push(chunk as Buffer);
    }
    if (!chunks.length) return {};
    try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
        return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    } catch {
        throw new PtbkError('Invalid JSON body.', { kind: 'usage' });
    }
}

/**
 * Sends JSON without caching.
 */
function sendJson(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
    response.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', Pragma: 'no-cache', ...headers });
    response.end(JSON.stringify(body));
}

/**
 * Starts the loopback HTTP server serving the SPA shell and the authenticated service API.
 *
 * @private local HTTP server
 */
export async function startHttpServer(options: HttpServerOptions): Promise<RunningHttpServer> {
    const { agenda } = options;
    const csrfToken = secretToken(32);
    const spaDirectory = engineModule('service/spa');
    const server = createServer((request, response) => {
        void handle(request, response).catch((error: unknown) => {
            if (response.headersSent) {
                response.end();
                return;
            }
            const status = error instanceof PtbkError ? (error.details.kind === 'usage' ? 400 : error.details.kind === 'conflict' ? 409 : error.details.kind === 'not-found' ? 404 : 500) : 500;
            sendJson(response, status, { error: errorMessage(error), next: error instanceof PtbkError ? error.details.next : undefined });
        });
    });
    server.keepAliveTimeout = 5000;
    server.headersTimeout = 30_000;

    const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
        const address = server.address();
        if (!address || typeof address === 'string') throw new PtbkError('The local listener is unavailable.', { kind: 'technical' });
        assertLocalRequest(request, address.port);
        const url = new URL(request.url ?? '/', 'http://localhost');
        const method = request.method ?? 'GET';
        const asset = STATIC_FILES[url.pathname];
        if (method === 'GET' && asset) {
            const content = await readFile(join(spaDirectory, asset));
            const extension = asset.split('.').pop()!;
            response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': CONTENT_TYPES[extension]!, 'Cache-Control': asset === 'index.html' ? 'no-store' : 'private, max-age=300' });
            response.end(content);
            return;
        }
        if (!url.pathname.startsWith('/api/')) {
            sendJson(response, 404, { error: 'Not found.' });
            return;
        }
        if (url.pathname === '/api/health' && method === 'GET') {
            sendJson(response, 200, { service: 'ptbk' });
            return;
        }
        if (url.pathname === '/api/session' && method === 'GET') {
            // A custom header makes browser bootstrap a same-origin, non-simple request. No cookie or persistent
            // device session is created; the capability expires when this engine stops.
            if (request.headers['x-ptbk-client'] !== 'dashboard') {
                sendJson(response, 401, { error: 'Local dashboard bootstrap header required.' });
                return;
            }
            sendJson(response, 200, { csrf: csrfToken });
            return;
        }
        const who = authenticateLocalRequest(request, options.token, csrfToken);
        if (!who) {
            sendJson(response, 401, { error: 'Local client authentication required.' });
            return;
        }
        if (url.pathname === '/api/state' && method === 'GET') {
            const after = Number(url.searchParams.get('after') ?? NaN);
            if (Number.isFinite(after)) await agenda.waitForChange(after, Math.min(LONG_POLL_MS, Number(url.searchParams.get('wait') ?? LONG_POLL_MS)));
            sendJson(response, 200, agenda.snapshot());
            return;
        }
        if (url.pathname === '/api/wallet' && method === 'GET') {
            // Readiness, login labels and pending requests only: no endpoint returns a password, key or record.
            sendJson(response, 200, agenda.wallet.view());
            return;
        }
        if (url.pathname === '/api/usage' && method === 'GET') {
            // A read-only view over durable raw usage and independent price observations (never writes usage).
            const grouping = url.searchParams.get('group') ?? 'none';
            const scope = url.searchParams.get('scope') ?? 'self';
            const days = Number(url.searchParams.get('days') ?? 7);
            if (!['none', 'agent', 'harness', 'model', 'work', 'day'].includes(grouping) || !['self', 'inclusive'].includes(scope) || !Number.isFinite(days) || days <= 0 || days > 3660) {
                sendJson(response, 400, { error: 'Use group=none|agent|harness|model|work|day, scope=self|inclusive and days between 1 and 3660.' });
                return;
            }
            sendJson(response, 200, await agenda.usageSummary({ days, grouping: grouping as UsageGrouping, scope: scope as 'self' | 'inclusive' }));
            return;
        }
        if (url.pathname === '/api/chat-agents' && method === 'GET') {
            sendJson(response, 200, { agents: await applyChatAction(agenda, 'chat-agents', {}, 'api') });
            return;
        }
        if (url.pathname === '/api/tasks' && method === 'GET') {
            // The complete inventory in every state; `sort` applies the shared viewer orders (never scheduling).
            const sort = url.searchParams.get('sort');
            const tasks = await agenda.taskInventory();
            if (sort && !(TASK_SORT_FIELDS as readonly string[]).includes(sort)) throw new PtbkError(`Unknown task sort "${sort}".`, { kind: 'usage', next: [`Use one of ${TASK_SORT_FIELDS.join(', ')}.`] });
            sendJson(response, 200, { tasks: sort ? sortTasks(tasks, sort as TaskSortField, url.searchParams.get('descending') === '1') : tasks });
            return;
        }
        if (url.pathname === '/api/books' && method === 'GET') {
            const reference = url.searchParams.get('ref') ?? undefined;
            const path = url.searchParams.get('path') ?? undefined;
            sendJson(response, 200, await agenda.bookSource({ reference, path }));
            return;
        }
        // Chats are selected by their normalized name (URL-encoded), never by a generated ID.
        const chatMatch = /^\/api\/chats(?:\/([^/]+)(?:\/(messages|read))?)?$/.exec(url.pathname);
        const chatName = chatMatch?.[1] ? decodeURIComponent(chatMatch[1]) : undefined;
        if (chatMatch && method === 'GET' && !chatMatch[2]) {
            sendJson(response, 200, chatName ? await applyChatAction(agenda, 'chat-get', { name: chatName }, 'api') : { chats: await applyChatAction(agenda, 'chat-list', {}, 'api') });
            return;
        }
        if (method !== 'POST') {
            sendJson(response, 405, { error: 'Method not allowed.' });
            return;
        }
        const body = await readJsonBody(request);
        if (url.pathname === '/api/control') {
            const action = String(body.action ?? '');
            if (!CONTROL_ACTIONS.has(action)) throw new PtbkError(`Unknown control action "${action}".`, { kind: 'usage' });
            sendJson(
                response,
                200,
                await options.control(action, {
                    replaceStop: body.replaceStop === true,
                    revision: typeof body.revision === 'number' ? body.revision : undefined,
                    ...(typeof body.name === 'string' ? { name: body.name } : {}),
                    ...(typeof body.incident === 'string' ? { incident: body.incident } : {}),
                    // Health's destructive/privileged operations run only with the explicit confirmation of their preview.
                    ...(body.confirm === true ? { confirm: true } : {}),
                    ...(body.apply === true ? { apply: true } : {}),
                }),
            );
            return;
        }
        if (url.pathname === '/api/wallet') {
            // Protected owner input: credentials and words are write-only and never logged or echoed. The words of a
            // new setup are shown only to the local browser, never to a direct API client.
            const action = String(body.action ?? '');
            if (!WALLET_ACTIONS.has(action) || action === 'wallet') throw new PtbkError(`Unknown Wallet action "${action}".`, { kind: 'usage' });
            sendJson(response, 200, await applyWalletAction(agenda, action, body, { ownerSurface: who === 'browser' }));
            return;
        }
        if (url.pathname === '/api/tools') {
            // Saved tool management through the shared operation; secrets are write-only and never echoed.
            sendJson(response, 200, await applyToolAction(agenda, body, who === 'api' ? 'api' : 'dashboard'));
            return;
        }
        if (chatMatch) {
            const via = who === 'api' ? 'api' : 'browser';
            if (!chatName) sendJson(response, 200, await applyChatAction(agenda, 'chat-create', { agent: body.agent, text: body.text, title: body.title, requestKey: body.requestKey }, via));
            else if (chatMatch[2] === 'messages') sendJson(response, 200, await applyChatAction(agenda, 'chat-send', { name: chatName, text: body.text, expected: body.expected }, via));
            else if (chatMatch[2] === 'read') sendJson(response, 200, await applyChatAction(agenda, 'chat-read', { name: chatName }, via));
            else sendJson(response, 405, { error: 'Method not allowed.' });
            return;
        }
        if (url.pathname === '/api/books') {
            // Text only: an HTTP client never makes the engine copy host files into the project.
            sendJson(response, 200, await agenda.bookSave({ path: String(body.path ?? ''), text: String(body.text ?? ''), revision: String(body.revision ?? '') }));
            return;
        }
        if (url.pathname === '/api/settings') {
            sendJson(response, 200, await applySettings(agenda, body));
            return;
        }
        sendJson(response, 404, { error: 'Not found.' });
    };

    const port = await listen(server, options.port);
    return {
        port,
        url: `http://127.0.0.1:${port}/`,
        close: async () => {
            server.closeAllConnections?.();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        },
    };
}
