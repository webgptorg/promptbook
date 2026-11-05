import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { acceptWebSocket, refuseUpgrade, type ServerWebSocket } from '../common/websocket.js';

/**
 * The feature-specific part of a temporary browser surface: its title, styles, markup and script. The script talks to
 * its owner only through the global `surface` object the presenter's transport defines (`send`, `sendBinary`,
 * `onopen`, `onmessage`, `onbinary`, `onclose`, `status`), so the same page works over the terminal's temporary server
 * and inside the desktop client.
 *
 * @private interactive feature surfaces
 */
export type FeaturePage = {
    readonly title: string;
    readonly style: string;
    readonly body: string;
    readonly script: string;
};

/**
 * Observed state of a temporary surface: `waiting` for the invited page, `attached` to its one authorized page,
 * `detached` (the page closed or its connection was lost), `expired` (the invitation was not used in time) or `closed`.
 *
 * @private interactive feature surfaces
 */
export type FeatureSurfaceState = 'waiting' | 'attached' | 'detached' | 'expired' | 'closed';

/**
 * Options of one temporary surface.
 *
 * @private interactive feature surfaces
 */
export type FeatureSurfaceOptions = {
    /** The page of the feature. */
    readonly page: FeaturePage;
    /** `Permissions-Policy` of the page (for example `microphone=(self)`); everything else stays denied. */
    readonly permissions?: string;
    /** How long an unused invitation stays valid (default two minutes). */
    readonly invitationMs?: number;
    /** How long the attached page may be silent (it answers pings even in the background) before it counts as lost. */
    readonly livenessMs?: number;
    /** How long a detached page may recover its session (a transient reconnect or a reload of the same tab). */
    readonly reattachMs?: number;
    /** Largest accepted message. */
    readonly maxMessageBytes?: number;
    /** A message of the attached page. */
    readonly onMessage: (message: Readonly<Record<string, unknown>>) => void;
    /** A binary message of the attached page. */
    readonly onBinary?: (data: Buffer) => void;
    /** The surface state changed (`recovered`: a detached page came back with its session). */
    readonly onState: (state: FeatureSurfaceState, detail: { readonly reason?: string; readonly recovered?: boolean }) => void;
};

/**
 * Default lifetime of an unused invitation.
 */
const INVITATION_MS = 120_000;

/**
 * Default liveness bound of the attached page.
 */
const LIVENESS_MS = 15_000;

/**
 * How long a new connection may take to authenticate.
 */
const HELLO_MS = 10_000;

/**
 * Most simultaneous connections the listener accepts (the authorized page plus refused attempts).
 */
const MAX_CONNECTIONS = 8;

/**
 * Whether two secrets are equal (constant time).
 */
function sameSecret(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Escapes text for HTML.
 *
 * @private interactive feature surfaces
 */
export function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

/**
 * Serializes a value into an inline script safely.
 *
 * @private interactive feature surfaces
 */
export function scriptValue(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
        .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

/**
 * Shared styles of every surface (theme tokens and the transport's status banner).
 */
const BASE_STYLE = `:root { color-scheme: light dark; --bg: #f6f5f2; --fg: #1d1d1f; --muted: #6b6b70; --accent: #3a6df0; --warn: #b5541a; --panel: #ffffff; --line: #d9d8d3; }
@media (prefers-color-scheme: dark) { :root { --bg: #121214; --fg: #ececf0; --muted: #9a9aa3; --accent: #7a9cff; --warn: #f0a070; --panel: #1c1c20; --line: #34343a; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
#surface-status { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); max-width: calc(100% - 32px); padding: 8px 14px; border-radius: 8px; background: var(--panel); border: 1px solid var(--line); box-shadow: 0 4px 16px rgb(0 0 0 / 0.15); z-index: 1000; font-size: 14px; }
#surface-status.warning { color: var(--warn); }
[hidden] { display: none !important; }`;

/**
 * The terminal transport of a surface page: it redeems the single-use invitation from the URL fragment (never sent to
 * the server, so a preview or prefetch of the link redeems nothing) through an authenticated WebSocket handshake,
 * removes it from the visible URL, keeps only a scoped session grant for transient reconnects of this same tab, and
 * exposes the `surface` object to the feature script.
 *
 * @private interactive feature surfaces
 */
export function socketTransportScript(): string {
    return `(() => {
  const statusLine = document.getElementById('surface-status');
  const KEY = 'ptbk-surface-session';
  let token = new URLSearchParams(location.hash.slice(1)).get('t') || '';
  let session = '';
  try { session = sessionStorage.getItem(KEY) || ''; } catch {}
  let socket, opened = false, ended = false, retries = 0;
  const surface = window.surface = {
    onopen: null, onmessage: null, onbinary: null, onclose: null,
    get open() { return Boolean(socket && socket.readyState === 1 && opened); },
    send(message) { if (socket && socket.readyState === 1 && opened) socket.send(JSON.stringify(message)); },
    sendBinary(data) { if (socket && socket.readyState === 1 && opened) socket.send(data); },
    status(text, tone) { statusLine.textContent = text || ''; statusLine.className = tone || ''; statusLine.hidden = !text; },
  };
  const end = (reason) => {
    if (ended) return;
    ended = true;
    try { sessionStorage.removeItem(KEY); } catch {}
    surface.status(reason, 'warning');
    if (surface.onclose) surface.onclose(reason);
  };
  const connect = () => {
    socket = new WebSocket('ws://' + location.host + '/surface');
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => socket.send(JSON.stringify(token ? { type: 'hello', token } : { type: 'hello', session }));
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') { if (opened && surface.onbinary) surface.onbinary(event.data); return; }
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'welcome') {
        const recovered = opened || !token;
        session = message.session; token = ''; retries = 0;
        try { sessionStorage.setItem(KEY, session); } catch {}
        // The single-use invitation is spent: it leaves the visible URL and the history entry.
        history.replaceState(null, '', location.pathname);
        opened = true;
        surface.status('');
        if (surface.onopen) surface.onopen({ recovered });
      } else if (message.type === 'refused' || message.type === 'ended') {
        end(message.reason || 'This page is no longer connected.');
        socket.close();
      } else if (opened && surface.onmessage) surface.onmessage(message);
    };
    socket.onclose = () => {
      if (ended) return;
      if (!session || retries >= 8) return end(opened ? 'The connection to your terminal was lost.' : 'This page could not connect. Open the link from your terminal again.');
      retries++;
      surface.status('Connection lost; reconnecting…', 'warning');
      setTimeout(connect, Math.min(4000, 400 * retries));
    };
  };
  if (!token && !session) { end('This link is incomplete or was already used. Open the link shown in your terminal.'); return; }
  connect();
  addEventListener('pagehide', (event) => { if (!event.persisted && socket) socket.close(); });
})();`;
}

/**
 * Composes a complete surface document from the feature page and a transport script (both with the CSP nonce).
 *
 * @private interactive feature surfaces
 */
export function featureDocument(page: FeaturePage, nonce: string, transport: string): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(page.title)}</title>
<style nonce="${nonce}">
${BASE_STYLE}
${page.style}
</style>
</head>
<body>
${page.body}
<p id="surface-status" role="status" aria-live="polite" hidden></p>
<script nonce="${nonce}">
${transport}
</script>
<script nonce="${nonce}">
${page.script}
</script>
</body>
</html>
`;
}

/**
 * A temporary browser surface owned by the CLI process presenting an interactive feature: it listens on an
 * OS-allocated loopback port, serves one page and attaches exactly one authorized page per operation. The invitation
 * is single-use, short-lived and redeemed only by the page's authenticated handshake; host and origin are checked for
 * every request and connection; the listener exposes only this operation's messages (no project control, browser
 * debugging endpoint or credentials). It works without the project HTTP server, and closing it revokes the page,
 * stops accepting input and releases the port.
 *
 * @private interactive feature surfaces
 */
export class FeatureSurface {
    private invitation?: { readonly token: string; readonly expires: number };
    private session?: string;
    private owner?: ServerWebSocket;
    private lastActivity = 0;
    private detachedAt?: number;
    private currentState: FeatureSurfaceState = 'waiting';
    private readonly connections = new Set<ServerWebSocket>();
    private readonly timer: NodeJS.Timeout;
    private closedSurface = false;

    private constructor(
        private readonly server: Server,
        public readonly port: number,
        private readonly options: FeatureSurfaceOptions,
    ) {
        this.issue();
        const liveness = options.livenessMs ?? LIVENESS_MS;
        this.timer = setInterval(() => this.tick(), Math.max(250, Math.min(5_000, liveness / 3)));
        this.timer.unref();
    }

    /**
     * Starts a surface on an OS-allocated loopback port and resolves once the listener is ready.
     */
    public static async start(options: FeatureSurfaceOptions): Promise<FeatureSurface> {
        let surface: FeatureSurface | undefined;
        const server = createServer((request, response) => {
            if (surface) surface.serve(request, response);
            else response.writeHead(503).end();
        });
        server.on('upgrade', (request: IncomingMessage, socket: Duplex) => {
            if (surface) surface.upgrade(request, socket);
            else socket.destroy();
        });
        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', () => {
                server.off('error', reject);
                resolve();
            });
        });
        const address = server.address();
        surface = new FeatureSurface(server, typeof address === 'object' && address ? address.port : 0, options);
        return surface;
    }

    /** The launch link of the current invitation (only for the owning terminal; never persisted or logged). */
    public get url(): string {
        return `http://127.0.0.1:${this.port}/#t=${this.invitation?.token ?? ''}`;
    }

    /** The current state. */
    public get state(): FeatureSurfaceState {
        return this.currentState;
    }

    /** Whether an authorized page is attached now. */
    public get attached(): boolean {
        return Boolean(this.owner && !this.owner.closed);
    }

    /** Bytes waiting to be written to the attached page (streamed media drops stale frames above a bound). */
    public get backlog(): number {
        return this.owner?.pending ?? 0;
    }

    /**
     * Issues a fresh invitation on an explicit retry (the previous link stops working). Refused while a page is
     * attached; a detached page's session is revoked, so only the new link can attach.
     */
    public retry(): string {
        if (this.closedSurface) throw new Error('This surface is closed.');
        if (this.attached) throw new Error('A page is attached already.');
        this.session = undefined;
        this.detachedAt = undefined;
        this.issue();
        this.setState('waiting', {});
        return this.url;
    }

    /** Sends a message to the attached page (dropped while none is attached). */
    public send(message: Readonly<Record<string, unknown>>): void {
        if (this.attached) this.owner!.sendText(JSON.stringify(message));
    }

    /** Sends binary data to the attached page. */
    public sendBinary(data: Buffer): void {
        if (this.attached) this.owner!.sendBinary(data);
    }

    /**
     * Closes the surface (idempotent): the page is told why, its grant is revoked, input stops and the port is released.
     */
    public async close(reason = 'This page was closed by its owner.'): Promise<void> {
        if (this.closedSurface) return;
        this.closedSurface = true;
        clearInterval(this.timer);
        this.invitation = undefined;
        this.session = undefined;
        const owner = this.owner;
        this.owner = undefined;
        if (owner && !owner.closed) {
            owner.sendText(JSON.stringify({ type: 'ended', reason }));
            owner.close(1000, 'ended');
        }
        for (const connection of this.connections) connection.close(1001, 'closed');
        this.connections.clear();
        this.setState('closed', { reason });
        await new Promise<void>((resolve) => {
            this.server.close(() => resolve());
            (this.server as Server & { closeAllConnections?: () => void }).closeAllConnections?.();
        });
    }

    /** A new single-use invitation. */
    private issue(): void {
        this.invitation = { token: randomBytes(24).toString('base64url'), expires: Date.now() + (this.options.invitationMs ?? INVITATION_MS) };
    }

    /** Changes and reports the state. */
    private setState(state: FeatureSurfaceState, detail: { readonly reason?: string; readonly recovered?: boolean }): void {
        if (this.currentState === 'closed') return;
        this.currentState = state;
        this.options.onState(state, detail);
    }

    /** Liveness of the attached page, expiry of an unused invitation and of a detached session. */
    private tick(): void {
        if (this.closedSurface) return;
        const now = Date.now();
        if (this.owner && !this.owner.closed) {
            if (now - this.lastActivity > (this.options.livenessMs ?? LIVENESS_MS)) {
                // No pong and no message within the bound: the page (or its computer) is gone.
                this.owner.close(4002, 'lost');
                return;
            }
            this.owner.ping();
        }
        if (this.invitation && now > this.invitation.expires && this.currentState === 'waiting') {
            this.invitation = undefined;
            this.setState('expired', { reason: 'The link expired before a page opened it.' });
        }
        if (this.session && this.detachedAt !== undefined && now - this.detachedAt > (this.options.reattachMs ?? 0)) this.session = undefined;
    }

    /** Whether a request addresses this listener by its exact loopback host (no DNS-rebound name). */
    private hostAllowed(request: IncomingMessage): boolean {
        return request.headers.host === `127.0.0.1:${this.port}`;
    }

    /** Serves the page document; everything else is refused. */
    private serve(request: IncomingMessage, response: ServerResponse): void {
        const plain = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' };
        if (!this.hostAllowed(request)) {
            response.writeHead(421, plain).end('Wrong host.');
            return;
        }
        const path = (request.url ?? '/').split('?')[0];
        if (request.method !== 'GET' || path !== '/' || this.closedSurface) {
            response.writeHead(request.method === 'GET' ? 404 : 405, plain).end(this.closedSurface ? 'This page has ended.' : 'Not found.');
            return;
        }
        const nonce = randomBytes(16).toString('base64');
        response.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'same-origin',
            'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src ws://127.0.0.1:${this.port}; img-src blob: data:; media-src blob: mediastream:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
            'Permissions-Policy': this.options.permissions ?? 'microphone=(), camera=(), geolocation=()',
        });
        response.end(featureDocument(this.options.page, nonce, socketTransportScript()));
    }

    /** Accepts a WebSocket of this listener's own page (exact host and origin), which must then authenticate. */
    private upgrade(request: IncomingMessage, socket: Duplex): void {
        const origin = `http://127.0.0.1:${this.port}`;
        if (this.closedSurface || !this.hostAllowed(request) || request.headers.origin !== origin || (request.url ?? '').split('?')[0] !== '/surface') {
            refuseUpgrade(socket, 403, 'Forbidden');
            return;
        }
        if (this.connections.size >= MAX_CONNECTIONS) {
            refuseUpgrade(socket, 503, 'Busy');
            return;
        }
        let authenticated = false;
        const connection = acceptWebSocket(
            request,
            socket,
            {
                onText: (text) => {
                    let message: Record<string, unknown>;
                    try {
                        message = JSON.parse(text) as Record<string, unknown>;
                    } catch {
                        return;
                    }
                    if (!message || typeof message !== 'object') return;
                    if (!authenticated) {
                        authenticated = this.hello(connection!, message);
                        if (authenticated) clearTimeout(helloTimer);
                        return;
                    }
                    if (connection !== this.owner) return;
                    this.options.onMessage(message);
                },
                onBinary: (data) => {
                    if (authenticated && connection === this.owner) this.options.onBinary?.(data);
                },
                onActivity: () => {
                    if (connection === this.owner) this.lastActivity = Date.now();
                },
                onClose: () => {
                    clearTimeout(helloTimer);
                    this.connections.delete(connection!);
                    if (connection !== this.owner) return;
                    this.owner = undefined;
                    if (this.closedSurface) return;
                    this.detachedAt = Date.now();
                    this.setState('detached', { reason: 'The page was closed or lost its connection.' });
                },
            },
            this.options.maxMessageBytes,
        );
        if (!connection) return;
        this.connections.add(connection);
        const helloTimer = setTimeout(() => {
            if (!authenticated) connection.close(4003, 'no handshake');
        }, HELLO_MS);
        helloTimer.unref();
    }

    /**
     * Authenticates a connection: the single-use invitation is redeemed atomically (once, unexpired, while no page is
     * attached), or the scoped session grant recovers a detached page. A concurrent or stale owner is refused.
     */
    private hello(connection: ServerWebSocket, message: Readonly<Record<string, unknown>>): boolean {
        const refuse = (reason: string): false => {
            connection.sendText(JSON.stringify({ type: 'refused', reason }));
            connection.close(4001, 'refused');
            return false;
        };
        if (message.type !== 'hello') return refuse('This page did not identify itself.');
        const token = typeof message.token === 'string' ? message.token : '';
        const session = typeof message.session === 'string' ? message.session : '';
        let recovered = false;
        if (token) {
            const invitation = this.invitation;
            if (!invitation || !sameSecret(token, invitation.token)) return refuse(this.attached ? 'This page is already open in another tab; use that one.' : 'This link was already used or replaced. Open the newest link shown in your terminal.');
            if (Date.now() > invitation.expires) return refuse('This link expired. Ask your terminal for a new one.');
            if (this.attached) return refuse('This page is already open in another tab; use that one.');
            this.invitation = undefined;
            this.session = randomBytes(24).toString('base64url');
        } else if (session && this.session && sameSecret(session, this.session)) {
            if (this.attached) return refuse('This page is already open in another tab; use that one.');
            recovered = true;
        } else return refuse(this.session && this.attached ? 'This page is already open in another tab; use that one.' : 'This page is no longer authorized. Open the newest link shown in your terminal.');
        this.owner = connection;
        this.lastActivity = Date.now();
        this.detachedAt = undefined;
        connection.sendText(JSON.stringify({ type: 'welcome', session: this.session }));
        this.setState('attached', { recovered });
        return true;
    }
}
