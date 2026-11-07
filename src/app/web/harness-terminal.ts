import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PtbkError } from '../../common/errors.js';
import type { OnboardingSession } from '../../onboarding/session.js';
import { HARNESS_TERMINAL_PATH } from '../../onboarding/terminal.js';
import type { Actor } from './access.js';
import { contractProblem, withTerminalStyleNonce } from './gateway.js';

/** Engine-built assets, resolved explicitly so a terminal path cannot address arbitrary files. */
const ASSETS: Readonly<Record<string, string>> = {
    'harness-terminal-browser.js': 'text/javascript; charset=utf-8',
    'xterm.js': 'text/javascript; charset=utf-8',
    'xterm.css': 'text/css; charset=utf-8',
};

/** Bounds a request even when Content-Length is absent, including encoded control characters. */
async function commandBody(request: Request): Promise<Record<string, unknown> | undefined> {
    const limit = 26 * 1024;
    if (!request.body || Number(request.headers.get('content-length')) > limit) return undefined;
    const reader = request.body.getReader();
    const bytes = new Uint8Array(limit);
    let size = 0;
    try {
        for (;;) {
            const part = await reader.read();
            if (part.done) break;
            if (size + part.value.length > limit) { void reader.cancel().catch(() => undefined); return undefined; }
            bytes.set(part.value, size);
            size += part.value.length;
        }
        const command: unknown = JSON.parse(new TextDecoder().decode(bytes.subarray(0, size)));
        return command && typeof command === 'object' && !Array.isArray(command) ? command as Record<string, unknown> : undefined;
    } catch {
        return undefined;
    } finally {
        reader.releaseLock();
    }
}

/** A terminal on the passkey-protected engine origin, behind the existing end-to-end relay. @private App web origin */
export async function harnessTerminalPage(request: Request, actor: Actor, session: OnboardingSession): Promise<Response | undefined> {
    const url = new URL(request.url);
    const path = HARNESS_TERMINAL_PATH;
    if (url.pathname !== path && !url.pathname.startsWith(path + '/')) return undefined;
    if (!session.remoteTerminalEnabled || url.search) return contractProblem('not-found');
    if (actor.role !== 'owner') return contractProblem('forbidden');
    const headers = { 'cache-control': 'no-store' };
    if (url.pathname === path && request.method === 'POST') {
        if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return new Response(null, { status: 415, headers });
        const command = await commandBody(request);
        if (!command) return new Response(null, { status: 400, headers });
        try {
            return Response.json(await session.terminal('web:' + actor.sessionId, command), { headers });
        } catch (error) {
            const status = error instanceof PtbkError && error.details.kind === 'conflict' ? 409 : 400;
            return new Response(null, { status, headers });
        }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return contractProblem('not-found');
    if (url.pathname === path) {
        const nonce = randomBytes(18).toString('base64');
        const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
            `<title>Native sign-in · Promptbook</title><link rel="stylesheet" href="${path}/xterm.css"><script defer src="${path}/xterm.js"></script>` +
            `<script type="module" data-terminal nonce="${nonce}" src="${path}/harness-terminal-browser.js"></script></head>` +
            '<body><main><h1>Native sign-in</h1><p>Open the provider’s link from the terminal. Paste any return code at its native prompt.</p>' +
            '<button type="button">Open sign-in terminal</button> <a href="/">Return to setup</a>' +
            '<p role="status"></p><div id="terminal"></div></main></body></html>';
        return withTerminalStyleNonce(new Response(request.method === 'HEAD' ? null : html, { headers: { ...headers, 'content-type': 'text/html; charset=utf-8' } }), nonce);
    }
    const name = url.pathname.slice(path.length + 1);
    if (!Object.hasOwn(ASSETS, name)) return contractProblem('not-found');
    const content = request.method === 'HEAD' ? null : new Uint8Array(await readFile(new URL('./' + name, import.meta.url)));
    return new Response(content, { headers: { ...headers, 'content-type': ASSETS[name]! } });
}
