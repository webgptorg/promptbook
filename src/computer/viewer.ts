import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { engineModule } from '../common/version.js';
import { errorMessage, PtbkError } from '../common/errors.js';

/** Owner-only native desktop methods, transported through the existing authenticated engine session. @private computer control */
export type ComputerOwnerMethod = 'computer-status' | 'computer-permissions' | 'computer-pause' | 'computer-resume' | 'computer-stop' | 'computer-screenshot' | 'computer-input';

/** Exact owner method set; no generic arbitrary engine command dispatch is accepted. @private computer control */
export const COMPUTER_OWNER_METHODS: ReadonlySet<string> = new Set<ComputerOwnerMethod>(['computer-status', 'computer-permissions', 'computer-pause', 'computer-resume', 'computer-stop', 'computer-screenshot', 'computer-input']);

/** Owner method handler shared by local IPC, authenticated HTTP and the App gateway. @private computer control */
export type ComputerOwnerHandler = (method: ComputerOwnerMethod, params: Readonly<Record<string, unknown>>) => Promise<unknown>;

/** Private no-cache responses prevent screenshots and clipboard/input responses entering caches. */
const PRIVATE_HEADERS = { 'cache-control': 'no-store, private', pragma: 'no-cache', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };

/** Serve the fixed native desktop viewer assets inside the engine's authenticated App origin. @private computer control */
export async function computerDocument(request: Request): Promise<Response | undefined> {
    const path = new URL(request.url).pathname;
    const file = path === '/computer' || path === '/computer/' ? 'computer.html' : path === '/assets/computer.js' ? 'computer.js' : path === '/assets/computer.css' ? 'computer.css' : undefined;
    if (!file) return undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { ...PRIVATE_HEADERS, allow: 'GET, HEAD' } });
    let content = await readFile(join(engineModule('service/spa'), file), 'utf8');
    if (file === 'computer.html') content = content.replace('<body>', '<body data-remote="true">');
    return new Response(request.method === 'HEAD' ? null : content, { headers: { ...PRIVATE_HEADERS, 'content-type': file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8' } });
}

/**
 * Engine extension under the existing App gateway's authenticated API prefix. The gateway has already enforced
 * same-origin mutations; this endpoint adds owner-only access and bounded bodies. Ordinary project members cannot
 * observe or operate the host desktop. This does not add a second remote transport or expose another computer.
 * @private computer control
 */
export async function computerAppRequest(request: Request, isOwner: boolean, handle: ComputerOwnerHandler): Promise<Response | undefined> {
    const path = new URL(request.url).pathname;
    const prefix = '/api/v1/computer';
    if (path !== prefix && !path.startsWith(`${prefix}/`)) return undefined;
    if (!isOwner) return Response.json({ error: 'Only the engine owner can access its desktop.' }, { status: 403, headers: PRIVATE_HEADERS });
    const suffix = path.slice(prefix.length);
    const action = suffix === '' || suffix === '/status' ? 'status' : suffix.slice(1);
    if (!['status', 'permissions', 'pause', 'resume', 'stop', 'screenshot', 'input'].includes(action)) return Response.json({ error: 'Not found.' }, { status: 404, headers: PRIVATE_HEADERS });
    const read = action === 'status' || action === 'screenshot';
    if (request.method !== (read ? 'GET' : 'POST')) return new Response(null, { status: 405, headers: { ...PRIVATE_HEADERS, allow: read ? 'GET' : 'POST' } });
    try {
        let body: Record<string, unknown> = {};
        if (!read) {
            // Bound chunked requests too, before parsing: clipboard/text inputs never become unbounded buffers.
            const chunks: Uint8Array[] = [];
            const reader = request.body?.getReader();
            let size = 0;
            if (reader) try {
                for (;;) {
                    const next = await reader.read();
                    if (next.done) break;
                    size += next.value.byteLength;
                    if (size > 128 * 1024) { await reader.cancel(); throw new PtbkError('Desktop request body too large.', { kind: 'usage' }); }
                    chunks.push(next.value);
                }
            } finally { reader.releaseLock(); }
            const text = Buffer.concat(chunks).toString('utf8');
            const value: unknown = text ? JSON.parse(text) : {};
            if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PtbkError('Expected a JSON object.', { kind: 'usage' });
            body = value as Record<string, unknown>;
        }
        return Response.json(await handle(`computer-${action}` as ComputerOwnerMethod, body), { headers: PRIVATE_HEADERS });
    } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: error instanceof SyntaxError || error instanceof PtbkError && error.details.kind === 'usage' ? 400 : 409, headers: PRIVATE_HEADERS });
    }
}
