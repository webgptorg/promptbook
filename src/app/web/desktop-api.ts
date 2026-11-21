import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmod, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { api } from '../../vendor/app-platform.js';
import { webRequest, writeResponse } from './origin.js';

/** A private native transport, discovered exclusively through the authenticated engine control channel. @private desktop app */
export type DesktopEndpoint = { readonly socketPath: string; readonly token: string };

/** Serves the versioned App API only after the native client presents its per-engine capability. @private desktop app */
export function createDesktopApiServer(token: string, handle: (request: Request) => Promise<Response>): ReturnType<typeof createServer> {
    const authorization = Buffer.from('Bearer ' + token);
    return createServer(async (req, res) => {
        const presented = Buffer.from(req.headers.authorization ?? '');
        if (presented.length !== authorization.length || !timingSafeEqual(authorization, presented)) {
            res.writeHead(401).end();
            return;
        }
        if (req.headers.host !== 'desktop.localhost' || !req.url?.startsWith(api.ENGINE_API_PREFIX + '/')) {
            res.writeHead(404).end();
            return;
        }
        const abort = new AbortController();
        res.once('close', () => abort.abort());
        try {
            const request = webRequest(req, abort.signal);
            request.headers.delete('authorization');
            await writeResponse(await handle(request), res, request.method ?? 'GET');
        } catch {
            if (!res.headersSent && !res.destroyed) res.writeHead(500).end();
            else res.destroy();
        }
    });
}

/** The desktop speaks the same streaming HTTP contract over an OS pipe. No TCP port or browser session is opened. @private desktop app */
export async function startDesktopApi(handle: (request: Request) => Promise<Response>): Promise<{ endpoint: DesktopEndpoint; close(): Promise<void> }> {
    const directory = process.platform === 'win32' ? undefined : await mkdtemp(join(tmpdir(), 'ptbk-ui-'));
    const token = randomBytes(32).toString('hex');
    const socketPath = directory ? join(directory, 'api.sock') : '\\\\.\\pipe\\ptbk-ui-' + randomBytes(16).toString('hex');
    const server = createDesktopApiServer(token, handle);
    try {
        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(socketPath, resolve);
        });
        if (directory) await chmod(socketPath, 0o600);
    } catch (error) {
        server.close();
        if (directory) await rm(directory, { recursive: true, force: true });
        throw error;
    }
    return {
        endpoint: { socketPath, token },
        async close() {
            const closed = new Promise<void>((resolve) => server.close(() => resolve()));
            server.closeAllConnections();
            await closed;
            if (directory) await rm(directory, { recursive: true, force: true });
        },
    };
}
