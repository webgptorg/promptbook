import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { highlightBook } from '../book/highlight.js';
import { parseUsageRequest } from '../engine/usage.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PtbkError, errorMessage } from '../common/errors.js';
import { engineModule } from '../common/version.js';
import type { Agenda } from '../engine/agenda.js';
import { secretToken } from '../common/ids.js';
import { applyChatAction, applySettings, applyToolAction, applyWalletAction, CONTROL_ACTIONS, WALLET_ACTIONS, type ControlOutcome } from './actions.js';
import { assertLocalRequest, authenticateLocalRequest } from './auth.js';
import { TASK_SORT_FIELDS, filterTasks, groupSupportingWork, sortTasks, taskFilterChoices, type TaskFilter, type TaskSortField } from '../tasks/views.js';

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
 * Largest authenticated Wallet request body (a password-manager export supplied by the local owner for import).
 */
const MAX_WALLET_BODY_BYTES = 16 * 1024 * 1024;

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
async function readJsonBody(request: IncomingMessage, limit = MAX_BODY_BYTES): Promise<Record<string, unknown>> {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        size += (chunk as Buffer).length;
        if (size > limit) throw new PtbkError('Request body too large.', { kind: 'usage' });
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
            // Groupings and filters combine (agent, task, chat, work, tool, harness, model); the engine validates them.
            sendJson(response, 200, await agenda.usageSummary(parseUsageRequest((name) => url.searchParams.get(name))));
            return;
        }
        if (url.pathname === '/api/report' && method === 'GET') {
            // The saved brief only: reading never calls Chatter or writes anything.
            sendJson(response, 200, agenda.reportSnapshot());
            return;
        }
        if (url.pathname === '/api/report' && method === 'POST') {
            const body = (await readJsonBody(request)) as { action?: string; at?: string };
            try {
                if (body.action === 'refresh') sendJson(response, 200, await agenda.requestReport());
                else if (body.action === 'discuss') sendJson(response, 200, await agenda.discussReport({ at: typeof body.at === 'string' ? body.at : undefined }));
                else sendJson(response, 400, { error: 'Use action refresh or discuss.' });
            } catch (error) {
                sendJson(response, error instanceof PtbkError && error.details.kind === 'not-found' ? 404 : 400, { error: errorMessage(error) });
            }
            return;
        }
        if (url.pathname === '/api/update' && method === 'GET') {
            // The engine-owned self-update: policy, installation and system-task progress (reading never looks up or installs).
            sendJson(response, 200, agenda.engineUpdate);
            return;
        }
        if (url.pathname === '/api/update' && method === 'POST') {
            // The same policy operation as the terminal dashboard (its own scoped commit); `check` only looks up releases.
            const body = (await readJsonBody(request)) as { action?: string; isAutoUpdateEnabled?: unknown };
            if (body.action === 'check') sendJson(response, 200, await agenda.checkEngineUpdate());
            else if (body.action === 'policy' && typeof body.isAutoUpdateEnabled === 'boolean') {
                await agenda.setAutoUpdate(body.isAutoUpdateEnabled);
                sendJson(response, 200, agenda.engineUpdate);
            } else sendJson(response, 400, { error: 'Use action check, or action policy with a boolean isAutoUpdateEnabled.' });
            return;
        }
        // Read-only project inspection: Git history (never fetched or changed) and confined nonhidden project files.
        const inspection: Record<string, () => Promise<unknown>> = {
            '/api/history': async () => await agenda.history({ limit: Number(url.searchParams.get('limit') ?? 200) || 200, skip: Number(url.searchParams.get('skip') ?? 0) || 0 }),
            '/api/history/commit': async () => await agenda.historyCommit(url.searchParams.get('sha') ?? ''),
            '/api/files': async () => await agenda.files(url.searchParams.get('path') ?? ''),
            // A Book carries the shared highlight ranges of the one parser (clients never re-parse Book syntax).
            '/api/files/file': async () => {
                const file = await agenda.file(url.searchParams.get('path') ?? '');
                return file.kind === 'book' && file.text !== undefined ? { ...file, highlight: highlightBook(file.text) } : file;
            },
        };
        const inspect = method === 'GET' ? inspection[url.pathname] : undefined;
        if (inspect) {
            try {
                sendJson(response, 200, await inspect());
            } catch (error) {
                sendJson(response, error instanceof PtbkError && error.details.kind === 'not-found' ? 404 : 400, { error: errorMessage(error) });
            }
            return;
        }
        if (url.pathname === '/api/actions' && method === 'GET') {
            // Saved external-action records (read-only: never a retry, provider call or commit).
            sendJson(response, 200, await agenda.actions.refresh());
            return;
        }
        if (url.pathname === '/api/actions/record' && method === 'GET') {
            const path = url.searchParams.get('path') ?? '';
            try {
                sendJson(response, 200, await agenda.actions.read(path));
            } catch (error) {
                sendJson(response, error instanceof PtbkError && error.details.kind === 'not-found' ? 404 : 400, { error: errorMessage(error) });
            }
            return;
        }
        if (url.pathname === '/api/chat-agents' && method === 'GET') {
            sendJson(response, 200, { agents: await applyChatAction(agenda, 'chat-agents', {}, 'api') });
            return;
        }
        if (url.pathname === '/api/tasks' && method === 'GET') {
            // The complete inventory in every state; `sort` and the filter fields apply the shared viewer choices
            // (never scheduling); `total` counts the unfiltered inventory and `choices` lists the values present in it.
            const sort = url.searchParams.get('sort');
            // `system` is the former name of engine-owned definitions (before purpose took that word).
            const kindParameter = url.searchParams.get('kind') ?? undefined;
            const kind = kindParameter === 'system' ? 'engine' : kindParameter;
            const purpose = url.searchParams.get('purpose') ?? undefined;
            const tasks = await agenda.taskInventory();
            if (sort && !(TASK_SORT_FIELDS as readonly string[]).includes(sort)) throw new PtbkError(`Unknown task sort "${sort}".`, { kind: 'usage', next: [`Use one of ${TASK_SORT_FIELDS.join(', ')}.`] });
            if (kind && kind !== 'ordinary' && kind !== 'engine') throw new PtbkError(`Unknown task kind "${kind}".`, { kind: 'usage', next: ['Use kind=ordinary or kind=engine.'] });
            if (purpose && !['content', 'system', 'undefined'].includes(purpose)) throw new PtbkError(`Unknown task purpose "${purpose}".`, { kind: 'usage', next: ['Use purpose=content, purpose=system or purpose=undefined.'] });
            const filter: TaskFilter = { text: url.searchParams.get('text') ?? undefined, readiness: url.searchParams.get('readiness') ?? undefined, agent: url.searchParams.get('agent') ?? undefined, kind: kind as TaskFilter['kind'], purpose: purpose as TaskFilter['purpose'] };
            const filtered = filterTasks(tasks, filter);
            const ordered = sort ? sortTasks(filtered, sort as TaskSortField, url.searchParams.get('descending') === '1') : filtered;
            // `supporting=hide|show` asks for the default presentation: supporting system work as a lower group
            // (collapsed when hidden); without it every matching task is listed in the chosen order.
            const supporting = url.searchParams.get('supporting');
            if (supporting === 'hide' || supporting === 'show') {
                const grouped = groupSupportingWork(ordered, { showSupporting: supporting === 'show', filter });
                sendJson(response, 200, { tasks: grouped.items, total: tasks.length, choices: taskFilterChoices(tasks), supporting: grouped.supporting, ...(grouped.firstSupporting !== undefined ? { firstSupporting: grouped.firstSupporting } : {}) });
                return;
            }
            sendJson(response, 200, { tasks: ordered, total: tasks.length, choices: taskFilterChoices(tasks) });
            return;
        }
        if (url.pathname === '/api/books' && method === 'GET') {
            const reference = url.searchParams.get('ref') ?? undefined;
            const path = url.searchParams.get('path') ?? undefined;
            const source = await agenda.bookSource({ reference, path });
            sendJson(response, 200, { ...source, highlight: highlightBook(source.text) });
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
        const body = await readJsonBody(request, url.pathname === '/api/wallet' ? MAX_WALLET_BODY_BYTES : MAX_BODY_BYTES);
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
        if (url.pathname === '/api/books/highlight') {
            // Highlighting of an unsaved editor text: read-only, from the same parser as every other Book surface.
            sendJson(response, 200, { highlight: highlightBook(String(body.text ?? '')) });
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
