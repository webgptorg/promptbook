'use strict';
const { request: httpRequest } = require('node:http');
const { createHash } = require('node:crypto');
const { Readable } = require('node:stream');
const { readFile } = require('node:fs/promises');
const { extname, join } = require('node:path');

/** Virtual HTTPS origin in each project's private Electron session. No DNS or TCP listener. */
const PROJECT_ORIGIN = 'https://desktop.localhost';
const PROJECTS_ORIGIN = 'https://projects.localhost';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.wasm': 'application/wasm', '.webp': 'image/webp' };

/** Forward contract headers and streamed bodies only. Credentials and socket selection belong to the main process. */
function pipeRequest(request, endpoint, url) {
    const headers = { host: 'desktop.localhost', authorization: 'Bearer ' + endpoint.token };
    for (const key of ['accept', 'content-type', 'last-event-id', 'if-match', 'if-none-match', 'idempotency-key']) {
        const value = request.headers.get(key);
        if (value !== null) headers[key] = value;
    }
    return new Promise((resolve, reject) => {
        const outgoing = httpRequest({ socketPath: endpoint.socketPath, path: url.pathname + url.search, method: request.method, headers, signal: request.signal }, (incoming) => {
            const received = new Headers();
            for (const key of ['content-type', 'cache-control', 'etag', 'retry-after', 'content-disposition', 'location']) {
                if (incoming.headers[key]) received.set(key, incoming.headers[key]);
            }
            const status = incoming.statusCode || 502;
            if (request.method === 'HEAD' || [204, 205, 304].includes(status)) {
                incoming.resume();
                resolve(new Response(null, { status, headers: received }));
            } else {
                // Cancelling the Chromium request/response releases its engine SSE subscription.
                resolve(new Response(Readable.toWeb(incoming), { status, headers: received }));
            }
        });
        outgoing.once('error', reject);
        if (request.body) Readable.fromWeb(request.body).on('error', (error) => outgoing.destroy(error)).pipe(outgoing);
        else outgoing.end();
    });
}

/** Hash paths and file contents in deterministic order across platforms. */
async function bundleDigest(directory, files) {
    const hash = createHash('sha256');
    for (const file of [...files].sort()) {
        hash.update(file).update('\0').update(createHash('sha256').update(await readFile(join(directory, file))).digest());
    }
    return hash.digest('hex');
}

/** Load the exact set of packaged files. The shell and private build metadata are outside the served directory. */
async function loadAppBundle(directory) {
    const metadata = JSON.parse(await readFile(join(directory, 'bundle.json'), 'utf8'));
    if (metadata.source !== 'webgptorg/app' || !/^[0-9a-f]{40}$/.test(metadata.commit) || !/^[0-9a-f]{64}$/.test(metadata.sha256) ||
        !Array.isArray(metadata.files) || !metadata.files.every((file) => typeof file === 'string' && !file.includes('\\') && !file.includes(':') && !file.split('/').some((part) => !part || part === '.' || part === '..')) ||
        !metadata.files.includes('index.html') || metadata.apiPrefix !== '/api/v1' || typeof metadata.csp !== 'string' || !metadata.csp) {
        throw new Error('The packaged Promptbook App UI is incomplete. Reinstall the desktop application.');
    }
    const files = new Set(metadata.files);
    if (files.size !== metadata.files.length || await bundleDigest(join(directory, 'public'), files) !== metadata.sha256) {
        throw new Error('The packaged Promptbook App UI does not match its build manifest.');
    }
    return async (request, endpoint) => {
        const url = new URL(request.url);
        if (url.origin !== PROJECT_ORIGIN || url.username || url.password) return new Response(null, { status: 403 });
        if (url.pathname.startsWith(metadata.apiPrefix + '/')) {
            if (!endpoint) return new Response(null, { status: 503 });
            const response = await pipeRequest(request, endpoint, url);
            // The security page describes the bundle this desktop is actually displaying.
            if (request.method === 'GET' && url.pathname === metadata.apiPrefix + '/security' && response.ok) {
                const overview = await response.json();
                overview.ui = { version: metadata.version, bundleSha256: metadata.sha256, releaseLogIndex: null, releaseLogEntryUuid: null, lastUpdateCheck: null };
                return Response.json(overview, { headers: { 'cache-control': 'no-store' } });
            }
            return response;
        }
        if (url.pathname === '/auth/sign-out' && request.method === 'POST') return new Response(null, { status: 204 });
        if (!['GET', 'HEAD'].includes(request.method) || /^\/(api|auth|setup|\.well-known)(\/|$)/.test(url.pathname)) return new Response(null, { status: 404 });
        let file = url.pathname.slice(1) || 'index.html';
        if (!files.has(file)) {
            if (file.startsWith('assets/') || !request.headers.get('accept')?.includes('text/html')) return new Response(null, { status: 404 });
            file = 'index.html';
        }
        const headers = { 'content-type': types[extname(file)] || 'application/octet-stream', 'content-security-policy': metadata.csp,
            'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cross-origin-resource-policy': 'same-origin' };
        return new Response(request.method === 'HEAD' ? null : await readFile(join(directory, 'public', file)), { headers });
    };
}
module.exports = { PROJECT_ORIGIN, PROJECTS_ORIGIN, bundleDigest, loadAppBundle };
